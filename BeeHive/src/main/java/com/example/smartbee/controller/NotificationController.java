package com.example.smartbee.controller;

import com.example.smartbee.model.AppNotification;
import com.example.smartbee.model.User;
import com.example.smartbee.repository.AppNotificationRepository;
import com.example.smartbee.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final AppNotificationRepository appNotificationRepository;
    private final UserRepository userRepository;

    private Long resolveFarmId(Long requestedFarmId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String email = auth.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                return userOpt.get().getFarmId();
            }
        }
        return requestedFarmId != null ? requestedFarmId : 1L;
    }

    @GetMapping
    public ResponseEntity<?> getNotifications() {
        return getNotificationsForFarm(null);
    }

    @GetMapping("/{farmIdParam}")
    public ResponseEntity<?> getNotificationsForFarm(@PathVariable(required = false) Long farmIdParam) {
        try {
            Long farmId = resolveFarmId(farmIdParam);
            List<AppNotification> notifications = appNotificationRepository.findTop30ByFarmIdOrderByCreatedAtDesc(farmId);
            long unreadCount = notifications.stream().filter(n -> !n.isRead()).count();

            return ResponseEntity.ok(Map.of(
                    "farmId", farmId,
                    "unreadCount", unreadCount,
                    "notifications", notifications
            ));
        } catch (Exception e) {
            log.error("Error fetching notifications: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id) {
        try {
            Optional<AppNotification> notifOpt = appNotificationRepository.findById(id);
            if (notifOpt.isPresent()) {
                AppNotification notif = notifOpt.get();
                notif.setRead(true);
                appNotificationRepository.save(notif);
                return ResponseEntity.ok(Map.of("success", true));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Notification not found"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
