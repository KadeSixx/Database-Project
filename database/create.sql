-- FitCore Gym Management System
-- Corrected MySQL 8+ schema based on the Task C report.

CREATE DATABASE IF NOT EXISTS gym_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE gym_db;

CREATE TABLE membership_plans (
  plan_id VARCHAR(20) PRIMARY KEY,
  plan_name VARCHAR(60) NOT NULL UNIQUE,
  monthly_cost DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL,
  benefits VARCHAR(255) NOT NULL,
  CONSTRAINT chk_plan_cost CHECK (monthly_cost >= 0),
  CONSTRAINT chk_plan_duration CHECK (duration_days > 0)
);

CREATE TABLE members (
  member_id VARCHAR(20) PRIMARY KEY,
  first_name VARCHAR(30) NOT NULL,
  last_name VARCHAR(30) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  join_date DATE NOT NULL,
  plan_id VARCHAR(20) NOT NULL,
  CONSTRAINT fk_member_plan FOREIGN KEY (plan_id)
    REFERENCES membership_plans(plan_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE employees (
  employee_id VARCHAR(20) PRIMARY KEY,
  first_name VARCHAR(30) NOT NULL,
  last_name VARCHAR(30) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  address VARCHAR(150) NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_employee_salary CHECK (salary >= 0)
);

CREATE TABLE trainers (
  employee_id VARCHAR(20) PRIMARY KEY,
  join_date DATE NOT NULL,
  specialization VARCHAR(50) NOT NULL,
  certification VARCHAR(80) NOT NULL,
  CONSTRAINT fk_trainer_employee FOREIGN KEY (employee_id)
    REFERENCES employees(employee_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE classes (
  class_id VARCHAR(20) PRIMARY KEY,
  trainer_id VARCHAR(20) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  class_time TIME NOT NULL,
  capacity INT NOT NULL,
  room_location VARCHAR(50) NOT NULL,
  CONSTRAINT chk_class_capacity CHECK (capacity > 0),
  CONSTRAINT fk_class_trainer FOREIGN KEY (trainer_id)
    REFERENCES trainers(employee_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE enrollments (
  enrollment_id VARCHAR(20) PRIMARY KEY,
  member_id VARCHAR(20) NOT NULL,
  class_id VARCHAR(20) NOT NULL,
  enrollment_date DATE NOT NULL,
  attendance_status ENUM('Present', 'Absent', 'Excused') NOT NULL,
  CONSTRAINT uq_member_class UNIQUE (member_id, class_id),
  CONSTRAINT fk_enrollment_member FOREIGN KEY (member_id)
    REFERENCES members(member_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_class FOREIGN KEY (class_id)
    REFERENCES classes(class_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE payments (
  payment_id VARCHAR(20) PRIMARY KEY,
  member_id VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM(
    'Cash', 'Visa', 'Mastercard', 'Discover', 'Diners Club',
    'Maestro', 'JCB', 'American Express', 'Online'
  ) NOT NULL,
  payment_status ENUM('Paid', 'Pending', 'Failed') NOT NULL,
  CONSTRAINT chk_payment_amount CHECK (amount > 0),
  CONSTRAINT fk_payment_member FOREIGN KEY (member_id)
    REFERENCES members(member_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);
