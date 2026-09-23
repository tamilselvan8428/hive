package com.example.smartbee.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "leds")
public class Led {
    @Id
    private String id;

    @Indexed(unique = true)
    private Long farmId;

    private String ledStatus; // "on" or "off"

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
