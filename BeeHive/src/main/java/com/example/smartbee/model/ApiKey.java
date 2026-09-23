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
@Document(collection = "apikeys")
public class ApiKey {
    @Id
    private String id;

    @Indexed(unique = true)
    private Long farmId;

    private String apiKey;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
