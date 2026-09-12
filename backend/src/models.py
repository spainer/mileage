from sqlalchemy import (
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    license = Column(String, nullable=False, unique=True)

    mileage_records = relationship(
        "MileageRecord",
        back_populates="car",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    insurance_reports = relationship(
        "InsuranceReport",
        back_populates="car",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class MileageRecord(Base):
    __tablename__ = "mileage_records"

    id = Column(Integer, primary_key=True)
    car_id = Column(
        Integer,
        ForeignKey("cars.id", ondelete="CASCADE"),
        nullable=False,
    )
    date = Column(Date, nullable=False)
    value = Column(Integer, nullable=False)

    car = relationship("Car", back_populates="mileage_records")


class InsuranceReport(Base):
    __tablename__ = "insurance_reports"

    id = Column(Integer, primary_key=True)
    car_id = Column(
        Integer,
        ForeignKey("cars.id", ondelete="CASCADE"),
        nullable=False,
    )
    date = Column(Date, nullable=False)
    value = Column(Integer, nullable=False)
    mileage_per_year = Column(Integer, nullable=False)

    car = relationship("Car", back_populates="insurance_reports")
