package com.example.smartbee.repository;

import com.example.smartbee.model.HeaterLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HeaterLogRepository extends MongoRepository<HeaterLog, String> {
    List<HeaterLog> findTop20ByFarmIdOrderByTimestampDesc(Long farmId);
}
