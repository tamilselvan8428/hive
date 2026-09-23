package com.example.smartbee.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "app_notifications")
public class AppNotification {
    @Id
    private String id;

    private Long farmId;
    private String title;
    private String message;
    private Double temperature;
    private String heaterStatus;
    private String mode;
    private String reason;
    private boolean read = false;
    private LocalDateTime createdAt;
}
