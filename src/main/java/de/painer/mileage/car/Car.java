package de.painer.mileage.car;

import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class Car {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    private String license;

    private String model;

}
