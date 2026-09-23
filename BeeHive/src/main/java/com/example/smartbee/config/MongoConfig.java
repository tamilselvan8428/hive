package com.example.smartbee.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class MongoConfig {

    @Value("${SPRING_DATA_MONGODB_URI}")
    private String mongoUri;

    @Bean
    public MongoClient mongoClient() {
        return MongoClients.create(mongoUri);
    }

    @Bean
    public MongoTemplate mongoTemplate() {
        return new MongoTemplate(mongoClient(), getDatabaseName());
    }
    
    private String getDatabaseName() {
        // Extract database name from URI, e.g. mongodb+srv://.../smart?retryWrites=true
        String db = "smart"; // default
        try {
            String[] parts = mongoUri.split("\\?");
            String[] pathParts = parts[0].split("/");
            if (pathParts.length > 3) {
                db = pathParts[pathParts.length - 1];
            }
        } catch (Exception e) {
            // ignore
        }
        return db;
    }
}
