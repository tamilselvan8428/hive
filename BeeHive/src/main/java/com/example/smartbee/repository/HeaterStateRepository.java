package com.example.smartbee.repository;

import com.example.smartbee.model.HeaterState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HeaterStateRepository extends MongoRepository<HeaterState, String> {
    Optional<HeaterState> findByFarmId(Long farmId);
}
