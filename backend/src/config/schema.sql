-- =============================================
-- TESDA Registration System - Database Schema
-- Run this in HeidiSQL on database: tesda_registration
-- =============================================

CREATE DATABASE IF NOT EXISTS tesda_registration CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tesda_registration;

-- Users (Admin & Encoder)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(9) PRIMARY KEY COMMENT 'Employee ID: 4-digit year + 5 digits',
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'encoder') NOT NULL DEFAULT 'encoder',
  full_name VARCHAR(150),
  security_question VARCHAR(255) COMMENT 'Admin only',
  security_answer_hash VARCHAR(255) COMMENT 'Admin only - hashed',
  reset_ticket VARCHAR(8) COMMENT 'Encoder only - 8-char reset ticket',
  ticket_expires_at DATETIME COMMENT 'Ticket expiry',
  ticket_used BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
);

-- Registrants (Full TESDA Form)
CREATE TABLE IF NOT EXISTS registrants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uli_number VARCHAR(25) UNIQUE COMMENT 'T2MIS Auto Generated',
  entry_date DATE,

  -- Section 2: Learner Profile
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  middle_name VARCHAR(100),
  extension_name VARCHAR(20) COMMENT 'Jr., Sr., etc.',
  address_street VARCHAR(255),
  address_barangay VARCHAR(100),
  address_district VARCHAR(100),
  address_city VARCHAR(100),
  address_province VARCHAR(100),
  address_region VARCHAR(100),
  email VARCHAR(100),
  contact_no VARCHAR(20),
  nationality VARCHAR(50) DEFAULT 'Filipino',

  -- Section 3: Personal Information
  sex ENUM('Male', 'Female'),
  civil_status ENUM('Single', 'Married', 'Separated/Divorced/Annulled', 'Widow/er', 'Common Law/Live-in'),
  employment_status ENUM('Wage-Employed', 'Underemployed', 'Self-Employed', 'Unemployed'),
  employment_type ENUM('None', 'Regular', 'Casual', 'Job Order', 'Probationary', 'Permanent', 'Contractual', 'Temporary'),
  birth_month VARCHAR(20),
  birth_day TINYINT,
  birth_year YEAR,
  age TINYINT,
  birthplace_city VARCHAR(100),
  birthplace_province VARCHAR(100),
  birthplace_region VARCHAR(100),
  educational_attainment VARCHAR(150),
  parent_guardian_name VARCHAR(200),
  parent_guardian_address VARCHAR(255),

  -- Section 4: Classification
  client_classification VARCHAR(100),

  -- Section 5 & 6: Disability
  disability_type VARCHAR(100),
  disability_cause VARCHAR(100),

  -- Section 7 & 8
  course_qualification VARCHAR(255),
  scholarship_type VARCHAR(100),

  -- Section 9: Privacy
  privacy_consent BOOLEAN DEFAULT FALSE,

  -- Photos
  id_photo_path VARCHAR(255),
  photo_1x1_path VARCHAR(255),

  -- Meta
  encoded_by VARCHAR(9),
  status ENUM('active', 'archived') DEFAULT 'active',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),

  FOREIGN KEY (encoded_by) REFERENCES users(id)
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(9),
  user_name VARCHAR(150),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50),
  details TEXT,
  ip_address VARCHAR(50),
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Courses / Qualifications
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  sector VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT NOW()
);

-- Backup logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255),
  size_kb INT,
  performed_by VARCHAR(9),
  created_at DATETIME DEFAULT NOW()
);

-- =============================================
-- Seed: Default Admin & Encoder accounts
-- Password for both: Admin@12345 / Encoder@12345
-- =============================================

INSERT IGNORE INTO users (id, username, email, password_hash, role, full_name, security_question, security_answer_hash) VALUES
('202500001', 'admin', 'admin@tesda-noveleta.gov.ph',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyYnB.CVu',
 'admin', 'System Administrator',
 'What is the name of your first school?',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyYnB.CVu'),
('202500002', 'encoder1', 'encoder1@tesda-noveleta.gov.ph',
 '$2a$10$rGJ2NIBJGfDGmwKiFBjYveNUkFnHFvfhHy9LHhVAv3XCBi0tJIf0C',
 'encoder', 'Data Encoder 1', NULL, NULL),
('202500003', 'encoder2', NULL,
 '$2a$10$rGJ2NIBJGfDGmwKiFBjYveNUkFnHFvfhHy9LHhVAv3XCBi0tJIf0C',
 'encoder', 'Data Encoder 2', NULL, NULL);

-- Seed: Sample courses
INSERT IGNORE INTO courses (name, code, sector) VALUES
('Computer Systems Servicing NC II', 'CSS-NC2', 'ICT'),
('Bread and Pastry Production NC II', 'BPP-NC2', 'Food and Beverage'),
('Caregiving NC II', 'CG-NC2', 'Health Social and Other Community Development Services'),
('Electrical Installation and Maintenance NC II', 'EIM-NC2', 'Electrical and Electronics'),
('Cookery NC II', 'COOK-NC2', 'Food and Beverage'),
('Shielded Metal Arc Welding NC I', 'SMAW-NC1', 'Metals and Engineering'),
('Driving NC II', 'DRV-NC2', 'Land Transportation'),
('Hairdressing NC II', 'HD-NC2', 'Wholesale and Retail Trading / Services');
