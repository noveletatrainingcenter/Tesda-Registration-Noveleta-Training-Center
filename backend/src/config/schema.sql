-- backend/src/config/schema.sql
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

-- Registration (Full TESDA MIS 03-01 Form)
CREATE TABLE IF NOT EXISTS registration (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uli_number VARCHAR(25) UNIQUE COMMENT 'T2MIS Auto Generated',
  entry_date DATE,

  -- Section 2: Learner / Manpower Profile — Name
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  middle_name VARCHAR(100),
  extension_name VARCHAR(20) COMMENT 'Jr., Sr., etc.',

  -- Section 2: Address
  address_subdivision VARCHAR(255) COMMENT 'Subdivision or Condominium name (optional)',
  address_street VARCHAR(255),
  address_barangay VARCHAR(100),
  address_city VARCHAR(100),
  address_province VARCHAR(100),
  address_region VARCHAR(100),

  -- Section 2: Contact
  email VARCHAR(100),
  contact_no VARCHAR(20),
  nationality VARCHAR(50) DEFAULT 'Filipino',

  -- Section 3.1 / 3.2: Personal
  sex ENUM('Male', 'Female'),
  civil_status ENUM('Single', 'Married', 'Separated/Divorced/Annulled', 'Widow/er', 'Common Law/Live-in'),

  -- Section 3.3: Employment
  employment_status ENUM('Wage-Employed', 'Underemployed', 'Self-Employed', 'Unemployed'),
  employment_type ENUM('None', 'Regular', 'Casual', 'Job Order', 'Probationary', 'Permanent', 'Contractual', 'Temporary') DEFAULT 'None',

  -- Section 3.4 / 3.5: Birthdate + Birthplace
  birth_month VARCHAR(20),
  birth_day TINYINT UNSIGNED,
  birth_year YEAR,
  age TINYINT UNSIGNED,
  birthplace_city VARCHAR(100),
  birthplace_province VARCHAR(100),
  birthplace_region VARCHAR(100),

  -- Section 3.6 / 3.7: Education + Guardian
  educational_attainment VARCHAR(150),
  parent_guardian_name VARCHAR(200),
  parent_guardian_address VARCHAR(255),

  -- Section 4: Classification
  client_classification VARCHAR(100),

  -- Section 5 / 6: Disability
  has_disability BOOLEAN NOT NULL DEFAULT FALSE,
  disability_type VARCHAR(100) NULL,
  disability_cause VARCHAR(50) NULL,

  -- Section 7 / 8: Course + Scholarship
  course_qualification VARCHAR(255),
  scholarship_type VARCHAR(100),

  -- Section 9: Privacy Consent
  privacy_consent BOOLEAN DEFAULT FALSE,

  -- Photos
  id_photo_path VARCHAR(255),
  photo_1x1_path VARCHAR(255),

  -- Meta
  encoded_by VARCHAR(9),                          -- matches users.id which is VARCHAR(9)
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
  sector VARCHAR(150),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(9),
  status ENUM('active', 'archived') DEFAULT 'active',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),

  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_sector (sector),
  INDEX idx_status (status)
);

-- Seed: Sample courses
INSERT IGNORE INTO courses (name, sector) VALUES
('Computer Systems Servicing NC II', 'ICT'),
('Bread and Pastry Production NC II', 'Food and Beverage'),
('Caregiving NC II', 'Health Social and Other Community Development Services'),
('Electrical Installation and Maintenance NC II', 'Electrical and Electronics'),
('Cookery NC II', 'Food and Beverage'),
('Shielded Metal Arc Welding NC I', 'Metals and Engineering'),
('Driving NC II', 'Land Transportation'),
('Hairdressing NC II', 'Wholesale and Retail Trading / Services');

-- =============================================
-- Seed: Default Admin & Encoder accounts
-- Password for both: Admin@12345 / Encoder@12345
-- =============================================

INSERT IGNORE INTO users (id, username, password_hash, role, full_name, security_question, security_answer_hash) VALUES
('202600001', 'admin',
 '$2b$10$xUWElhgQurTSaDm1cVu.cuIgaTdlnBeH8uCh7Y9QXgbGEVSdUdkgi',
 'admin', 'System Administrator',
 'What is the name of your first school?',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyYnB.CVu'),
('202600002', 'encoder1',
 '$2b$10$MjcI3dtNCAMYcnbPx7q1ZO.iOSmSmm/QiiRmfCueQaeNNZ1BpIgM.',
 'encoder', 'Data Encoder 1', NULL, NULL),
('202600003', 'encoder2',
 '$2b$10$MjcI3dtNCAMYcnbPx7q1ZO.iOSmSmm/QiiRmfCueQaeNNZ1BpIgM.',
 'encoder', 'Data Encoder 2', NULL, NULL);

-- =============================================
-- Reports Module — Add to schema.sql
-- Run these after your existing schema
-- =============================================

-- Report Header (one per generated report)
-- Drop and recreate (or just use CREATE TABLE if not exists)
CREATE TABLE IF NOT EXISTS reports (
  id                    INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title                 VARCHAR(255)    NOT NULL DEFAULT 'ENROLLMENT/TERMINAL REPORT',
  program_title         VARCHAR(255)    NULL,
  -- Report-level TVET Provider (kept for backward compat, now mostly empty)
  region                VARCHAR(100)    NULL,
  province              VARCHAR(100)    NULL,
  district              VARCHAR(100)    NULL,
  municipality          VARCHAR(100)    NULL,
  provider_name         VARCHAR(200)    NULL,
  tbp_id                VARCHAR(100)    NULL,
  address               TEXT            NULL,
  institution_type      VARCHAR(50)     NULL,
  classification        VARCHAR(100)    NULL,
  full_qualification    VARCHAR(200)    NULL,
  qualification_clustered VARCHAR(200)  NULL,
  -- Report-level Program Profile
  delivery_mode         VARCHAR(200)    NULL,
  qualification_ntr     VARCHAR(200)    NULL,
  copr_number           VARCHAR(100)    NULL,
  industry_sector       VARCHAR(200)    NULL,
  industry_sector_other VARCHAR(200)    NULL,
  -- Signatories
  prepared_by_left      VARCHAR(255)    NULL,
  prepared_by_right     VARCHAR(255)    NULL,
  nclc_admin            VARCHAR(255)    NULL,
  -- Meta
  status                ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_by            INT UNSIGNED    NULL,
  created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_status     (status),
  KEY idx_reports_created_by (created_by),
  KEY idx_reports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS report_trainees (
  id                      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  report_id               INT UNSIGNED  NOT NULL,
  registration_id         INT UNSIGNED  NOT NULL,
  -- Student ID
  student_id_number       VARCHAR(100)  NULL,
  -- Training fields
  pgs_training_component  VARCHAR(200)  NULL,
  voucher_number          VARCHAR(100)  NULL,
  client_type             VARCHAR(50)   NULL,
  date_started            DATE          NULL,
  date_finished           DATE          NULL,
  reason_not_finishing    TEXT          NULL,
  assessment_results      VARCHAR(200)  NULL,
  -- Employment fields
  employment_date         DATE          NULL,
  employer_name           VARCHAR(255)  NULL,
  employer_address        TEXT          NULL,
  -- Per-trainee TVET Provider Profile
  region                  VARCHAR(100)  NULL,
  province                VARCHAR(100)  NULL,
  district                VARCHAR(100)  NULL,
  municipality            VARCHAR(100)  NULL,
  provider_name           VARCHAR(200)  NULL,
  tbp_id                  VARCHAR(100)  NULL,
  address                 TEXT          NULL,
  institution_type        VARCHAR(50)   NULL,
  classification          VARCHAR(100)  NULL,
  full_qualification      VARCHAR(200)  NULL,
  qualification_clustered VARCHAR(200)  NULL,
  -- Per-trainee Program Profile
  qualification_ntr       VARCHAR(200)  NULL,
  copr_number             VARCHAR(100)  NULL,
  industry_sector         VARCHAR(200)  NULL,
  industry_sector_other   VARCHAR(200)  NULL,
  delivery_mode           VARCHAR(200)  NULL,
  -- Meta
  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rt_report_id      (report_id),
  KEY idx_rt_registration_id (registration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Run this on tesda_registration
CREATE TABLE IF NOT EXISTS sectors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(9) NULL,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_sectors_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed from your existing hardcoded list
INSERT IGNORE INTO sectors (name) VALUES
('Agriculture, Forestry and Fishery'),
('Automotive and Land Transportation'),
('Construction'),
('Electrical and Electronics'),
('Food and Beverage'),
('Garments, Textiles and Leather Industries'),
('Health Social and Other Community Development Services'),
('ICT'),
('Language and Related Services'),
('Metals and Engineering'),
('Personal Services'),
('Tourism (Hotel and Restaurant)'),
('Visual Arts and Graphic Design'),
('Wholesale and Retail Trading / Services'),
('Others');