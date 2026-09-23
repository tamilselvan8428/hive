package com.example.smartbee.repository;

import com.example.smartbee.model.Led;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LedRepository extends MongoRepository<Led, String> {
    Optional<Led> findByFarmId(Long farmId);
}
