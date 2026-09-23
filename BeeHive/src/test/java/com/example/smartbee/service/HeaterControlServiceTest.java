package com.example.smartbee.service;

import com.example.smartbee.model.HeaterLog;
import com.example.smartbee.model.HeaterState;
import com.example.smartbee.model.Led;
import com.example.smartbee.model.User;
import com.example.smartbee.repository.AppNotificationRepository;
import com.example.smartbee.repository.HeaterLogRepository;
import com.example.smartbee.repository.HeaterStateRepository;
import com.example.smartbee.repository.LedRepository;
import com.example.smartbee.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class HeaterControlServiceTest {

    @Mock
    private HeaterStateRepository heaterStateRepository;

    @Mock
    private HeaterLogRepository heaterLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LedRepository ledRepository;

    @Mock
    private AppNotificationRepository appNotificationRepository;

    @Mock
    private SmsService smsService;

    @InjectMocks
    private HeaterControlService heaterControlService;

    private User userA;
    private User userB;
    private HeaterState stateA;

    @BeforeEach
    void setUp() {
        userA = new User();
        userA.setId("userA_id");
        userA.setName("User A");
        userA.setEmail("usera@example.com");
        userA.setFarmId(1L);
        userA.setPhoneNumber("+919876543210");

        userB = new User();
        userB.setId("userB_id");
        userB.setName("User B");
        userB.setEmail("userb@example.com");
        userB.setFarmId(2L);
        userB.setPhoneNumber("+919111111111");

        stateA = new HeaterState();
        stateA.setFarmId(1L);
        stateA.setMode("AUTO");
        stateA.setHeaterStatus("OFF");
        stateA.setOnThreshold(30.0);
        stateA.setOffThreshold(35.0);
        stateA.setLastReason("Initialized");

        lenient().when(heaterStateRepository.findByFarmId(1L)).thenReturn(Optional.of(stateA));
        lenient().when(heaterStateRepository.save(any(HeaterState.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(heaterLogRepository.save(any(HeaterLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(ledRepository.findByFarmId(anyLong())).thenReturn(Optional.of(new Led()));
        lenient().when(userRepository.findByFarmId(1L)).thenReturn(Optional.of(userA));
        lenient().when(userRepository.findByFarmId(2L)).thenReturn(Optional.of(userB));
        lenient().when(smsService.sendHeaterAlert(anyString(), any(), anyString(), anyString(), anyString()))
                .thenReturn(new SmsService.SmsResult(true, "SENT", "Sent", "+91 ******3210"));
    }

    @Test
    @DisplayName("TEST 1: Temperature 28°C in AUTO mode turns heater ON and sends 1 SMS to User A registered number")
    void test1_tempLow_heaterOn_smsSent() {
        HeaterState result = heaterControlService.processTelemetry(1L, 28.0, 60.0, "AUTO", null, null);

        assertEquals("ON", result.getHeaterStatus());
        verify(smsService, times(1)).sendHeaterAlert(
                eq("+919876543210"),
                eq(28.0),
                eq("ON"),
                eq("AUTO"),
                contains("below 30.0°C")
        );
    }

    @Test
    @DisplayName("TEST 2: Temperature 29°C when already ON keeps heater ON and sends NO SMS (deduplication)")
    void test2_temp29_alreadyOn_noSms() {
        stateA.setHeaterStatus("ON"); // Already ON

        HeaterState result = heaterControlService.processTelemetry(1L, 29.0, 60.0, "AUTO", null, null);

        assertEquals("ON", result.getHeaterStatus());
        verify(smsService, never()).sendHeaterAlert(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("TEST 3: Temperature 36°C turns heater OFF and sends 1 SMS to User A")
    void test3_tempHigh_heaterOff_smsSent() {
        stateA.setHeaterStatus("ON");

        HeaterState result = heaterControlService.processTelemetry(1L, 36.0, 60.0, "AUTO", null, null);

        assertEquals("OFF", result.getHeaterStatus());
        verify(smsService, times(1)).sendHeaterAlert(
                eq("+919876543210"),
                eq(36.0),
                eq("OFF"),
                eq("AUTO"),
                contains("above 35.0°C")
        );
    }

    @Test
    @DisplayName("TEST 4: Temperature 34°C within hysteresis band when already OFF keeps heater OFF and sends NO SMS")
    void test4_hysteresisBand_alreadyOff_remainsOff() {
        stateA.setHeaterStatus("OFF"); // Already OFF

        HeaterState result = heaterControlService.processTelemetry(1L, 34.0, 60.0, "AUTO", null, null);

        assertEquals("OFF", result.getHeaterStatus());
        verify(smsService, never()).sendHeaterAlert(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("TEST 5: MANUAL mode with HEATER ON command sets state to ON and sends 1 SMS")
    void test5_manualMode_heaterOn_smsSent() {
        stateA.setMode("MANUAL");
        stateA.setHeaterStatus("OFF");

        HeaterState result = heaterControlService.setManualHeater(1L, true);

        assertEquals("ON", result.getHeaterStatus());
        verify(smsService, times(1)).sendHeaterAlert(
                eq("+919876543210"),
                any(),
                eq("ON"),
                eq("MANUAL"),
                eq("Manual control")
        );
    }

    @Test
    @DisplayName("TEST 6: Pressing HEATER ON again in MANUAL mode keeps it ON and sends NO duplicate SMS")
    void test6_manualMode_heaterOnAgain_noDuplicateSms() {
        stateA.setMode("MANUAL");
        stateA.setHeaterStatus("ON"); // Already ON

        HeaterState result = heaterControlService.setManualHeater(1L, true);

        assertEquals("ON", result.getHeaterStatus());
        verify(smsService, never()).sendHeaterAlert(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("TEST 7: Switching MANUAL to AUTO at 28°C immediately evaluates temperature and sends 1 SMS")
    void test7_switchManualToAuto_evaluatesImmediately() {
        stateA.setMode("MANUAL");
        stateA.setHeaterStatus("OFF");
        stateA.setCurrentTemperature(28.0);

        HeaterState result = heaterControlService.setMode(1L, "AUTO");

        assertEquals("AUTO", result.getMode());
        assertEquals("ON", result.getHeaterStatus());
        verify(smsService, times(1)).sendHeaterAlert(
                eq("+919876543210"),
                eq(28.0),
                eq("ON"),
                eq("AUTO"),
                contains("below 30.0°C")
        );
    }

    @Test
    @DisplayName("TEST 8: Two users with distinct hives - User A alert goes ONLY to User A, NOT User B")
    void test8_twoUsers_separateAlerts() {
        HeaterState stateB = new HeaterState();
        stateB.setFarmId(2L);
        stateB.setMode("AUTO");
        stateB.setHeaterStatus("OFF");
        lenient().when(heaterStateRepository.findByFarmId(2L)).thenReturn(Optional.of(stateB));

        // User A's hive changes state:
        heaterControlService.processTelemetry(1L, 27.0, 50.0, "AUTO", null, null);

        // Verify sent to User A only
        verify(smsService, times(1)).sendHeaterAlert(
                eq("+919876543210"), // User A
                any(),
                eq("ON"),
                anyString(),
                anyString()
        );
        verify(smsService, never()).sendHeaterAlert(
                eq("+919111111111"), // User B must NOT receive User A's notification
                any(),
                anyString(),
                anyString(),
                anyString()
        );

        // Now User B's hive changes state:
        heaterControlService.processTelemetry(2L, 26.0, 50.0, "AUTO", null, null);

        // Verify User B receives alert for User B's hive
        verify(smsService, times(1)).sendHeaterAlert(
                eq("+919111111111"), // User B
                any(),
                eq("ON"),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("TEST 9: User changes mobile number - future notifications use the updated number")
    void test9_userUpdatesMobileNumber_futureAlertsUseNewNumber() {
        // User changes phone number in profile
        userA.setPhoneNumber("+919812345678");

        heaterControlService.processTelemetry(1L, 26.0, 50.0, "AUTO", null, null);

        verify(smsService, times(1)).sendHeaterAlert(
                eq("+919812345678"), // Updated phone number!
                any(),
                eq("ON"),
                anyString(),
                anyString()
        );
    }

    @Test
    @DisplayName("TEST 10: SMS API failure does NOT crash heater system and records FAILED status")
    void test10_smsFailure_systemContinuesSafely() {
        when(smsService.sendHeaterAlert(anyString(), any(), anyString(), anyString(), anyString()))
                .thenReturn(new SmsService.SmsResult(false, "FAILED", "SMS Gateway error", "+91 ******3210"));

        HeaterState result = heaterControlService.processTelemetry(1L, 25.0, 50.0, "AUTO", null, null);

        // Heater state still successfully transitions to ON
        assertEquals("ON", result.getHeaterStatus());
        // Status recorded as FAILED without throwing exception
        assertEquals("FAILED", result.getLastSmsStatus());
    }

    @Test
    @DisplayName("SAFETY TEST: Sensor failure (NaN temperature) forces heater to safe OFF state")
    void test_sensorFailure_heaterDefaultsToOff() {
        stateA.setHeaterStatus("ON");

        HeaterState result = heaterControlService.processTelemetry(1L, Double.NaN, 50.0, "AUTO", null, null);

        assertEquals("OFF", result.getHeaterStatus());
        assertEquals("Temperature sensor unavailable", result.getLastReason());
    }

    @Test
    @DisplayName("SETTINGS TEST: Invalid thresholds where ON >= OFF are rejected")
    void test_invalidThresholds_rejected() {
        assertThrows(IllegalArgumentException.class, () -> {
            heaterControlService.updateThresholds(1L, 35.0, 30.0);
        });
    }
}
