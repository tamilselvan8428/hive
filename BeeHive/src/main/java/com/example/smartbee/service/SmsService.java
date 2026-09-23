package com.example.smartbee.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class SmsService {

    @Value("${sms.provider:MOCK}")
    private String smsProvider;

    // Twilio Settings
    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.from.number:}")
    private String twilioFromNumber;

    // MSG91 Settings
    @Value("${msg91.auth.key:}")
    private String msg91AuthKey;

    @Value("${msg91.sender.id:}")
    private String msg91SenderId;

    @Value("${msg91.template.id:}")
    private String msg91TemplateId;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static class SmsResult {
        private final boolean success;
        private final String status; // "SENT", "FAILED", "NO_PHONE_CONFIGURED", "NOT_REQUIRED"
        private final String message;
        private final String maskedRecipient;

        public SmsResult(boolean success, String status, String message, String maskedRecipient) {
            this.success = success;
            this.status = status;
            this.message = message;
            this.maskedRecipient = maskedRecipient;
        }

        public boolean isSuccess() { return success; }
        public String getStatus() { return status; }
        public String getMessage() { return message; }
        public String getMaskedRecipient() { return maskedRecipient; }
    }

    /**
     * Sends SMS notification specifically to the registered mobile number of the authenticated user.
     * Absolutely NO hardcoded or global fallback numbers allowed.
     */
    public SmsResult sendHeaterAlert(String userPhoneNumber, Double temperature, String heaterStatus, String mode, String reason) {
        if (userPhoneNumber == null || userPhoneNumber.trim().isEmpty()) {
            log.warn("[SMS] Notification skipped: User has no registered mobile number.");
            return new SmsResult(false, "NO_PHONE_CONFIGURED", "User has no registered mobile number", "None");
        }

        String targetPhone = userPhoneNumber.trim();
        String maskedPhone = maskPhoneNumber(targetPhone);
        String body = buildSmsMessage(temperature, heaterStatus, mode, reason);

        log.info("[SMS] Preparing to send heater alert to registered user: {}", maskedPhone);
        log.info("[SMS Content]\n{}", body);

        String provider = (smsProvider != null) ? smsProvider.trim().toUpperCase() : "MOCK";

        try {
            if ("TWILIO".equalsIgnoreCase(provider)) {
                return sendTwilioSms(targetPhone, body, maskedPhone);
            } else if ("MSG91".equalsIgnoreCase(provider)) {
                return sendMsg91Sms(targetPhone, body, maskedPhone, temperature, heaterStatus, mode, reason);
            } else {
                // Mock / Console Provider (for local development or when credentials are not yet set)
                log.info("[SMS MOCK SUCCESS] Alert dispatched to {}:\n{}", maskedPhone, body);
                return new SmsResult(true, "SENT", "Dispatched via mock SMS service to " + maskedPhone, maskedPhone);
            }
        } catch (Exception e) {
            log.error("[SMS ERROR] Failed to send SMS to {}: {}", maskedPhone, e.getMessage(), e);
            return new SmsResult(false, "FAILED", "SMS dispatch failed: " + e.getMessage(), maskedPhone);
        }
    }

    private String buildSmsMessage(Double temperature, String heaterStatus, String mode, String reason) {
        String tempStr = (temperature != null && !Double.isNaN(temperature))
                ? String.format("%.1f°C", temperature)
                : "Unavailable";
        return "Smart Bee Alert\n" +
                "Temperature: " + tempStr + "\n" +
                "Heater: " + heaterStatus + "\n" +
                "Mode: " + mode + "\n" +
                "Reason: " + (reason != null ? reason : "State change detected");
    }

    private SmsResult sendTwilioSms(String toPhone, String body, String maskedPhone) throws Exception {
        if (twilioAccountSid.isBlank() || twilioAuthToken.isBlank() || twilioFromNumber.isBlank()) {
            log.warn("[SMS] Twilio credentials missing in environment variables. Falling back to local log.");
            return new SmsResult(false, "FAILED", "Twilio credentials missing in backend environment", maskedPhone);
        }

        String url = "https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid + "/Messages.json";
        String form = "To=" + URLEncoder.encode(toPhone, StandardCharsets.UTF_8) +
                "&From=" + URLEncoder.encode(twilioFromNumber, StandardCharsets.UTF_8) +
                "&Body=" + URLEncoder.encode(body, StandardCharsets.UTF_8);

        String auth = Base64.getEncoder().encodeToString((twilioAccountSid + ":" + twilioAuthToken).getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Basic " + auth)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("[SMS] Twilio message sent successfully to {}", maskedPhone);
            return new SmsResult(true, "SENT", "Sent to " + maskedPhone + " via Twilio", maskedPhone);
        } else {
            log.error("[SMS] Twilio error {}: {}", response.statusCode(), response.body());
            return new SmsResult(false, "FAILED", "Twilio error: HTTP " + response.statusCode(), maskedPhone);
        }
    }

    private SmsResult sendMsg91Sms(String toPhone, String body, String maskedPhone, Double temperature, String heaterStatus, String mode, String reason) throws Exception {
        if (msg91AuthKey.isBlank()) {
            log.warn("[SMS] MSG91 Auth key missing. Falling back to local log.");
            return new SmsResult(false, "FAILED", "MSG91 credentials missing in backend environment", maskedPhone);
        }

        // MSG91 v5 flow API or standard SMS
        String cleanPhone = toPhone.replaceAll("[^0-9]", "");
        String url = "https://control.msg91.com/api/v5/flow/";

        String jsonPayload = String.format(
                "{\"template_id\":\"%s\",\"sender\":\"%s\",\"short_url\":\"0\",\"mobiles\":\"%s\",\"var1\":\"%.1f\",\"var2\":\"%s\",\"var3\":\"%s\"}",
                msg91TemplateId, msg91SenderId, cleanPhone,
                (temperature != null ? temperature : 0.0), heaterStatus, mode
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("authkey", msg91AuthKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("[SMS] MSG91 message sent successfully to {}", maskedPhone);
            return new SmsResult(true, "SENT", "Sent to " + maskedPhone + " via MSG91", maskedPhone);
        } else {
            log.error("[SMS] MSG91 error {}: {}", response.statusCode(), response.body());
            return new SmsResult(false, "FAILED", "MSG91 error: HTTP " + response.statusCode(), maskedPhone);
        }
    }

    public static String maskPhoneNumber(String phone) {
        if (phone == null || phone.isBlank()) return "Not set";
        String trimmed = phone.trim();
        if (trimmed.length() <= 4) return "****";
        int len = trimmed.length();
        String prefix = len > 8 ? trimmed.substring(0, len - 8) : "";
        String suffix = trimmed.substring(len - 4);
        return prefix + "******" + suffix;
    }
}
