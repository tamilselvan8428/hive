package com.example.smartbee.repository;

import com.example.smartbee.model.AppNotification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppNotificationRepository extends MongoRepository<AppNotification, String> {
    List<AppNotification> findTop30ByFarmIdOrderByCreatedAtDesc(Long farmId);
    List<AppNotification> findByFarmIdAndReadFalseOrderByCreatedAtDesc(Long farmId);
}
