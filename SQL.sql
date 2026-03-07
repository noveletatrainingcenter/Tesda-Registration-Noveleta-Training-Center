-- Users table
CREATE TABLE users (
  id VARCHAR(9) PRIMARY KEY,        -- Employee ID (year + digits)
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  role ENUM('admin', 'encoder'),
  security_question VARCHAR(255),
  security_answer VARCHAR(255),
  reset_ticket VARCHAR(8),
  ticket_expires_at DATETIME,
  created_at DATETIME DEFAULT NOW()
);

-- Registrants table (based on TESDA form)
CREATE TABLE registrants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uli_number VARCHAR(20),
  entry_date DATE,
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  middle_name VARCHAR(100),
  extension_name VARCHAR(20),
  address_street VARCHAR(255),
  address_barangay VARCHAR(100),
  address_district VARCHAR(100),
  address_city VARCHAR(100),
  address_province VARCHAR(100),
  address_region VARCHAR(100),
  email VARCHAR(100),
  contact_no VARCHAR(20),
  nationality VARCHAR(50),
  sex ENUM('male', 'female'),
  civil_status VARCHAR(50),
  employment_status VARCHAR(50),
  employment_type VARCHAR(50),
  birth_month VARCHAR(20),
  birth_day INT,
  birth_year INT,
  age INT,
  birthplace_city VARCHAR(100),
  birthplace_province VARCHAR(100),
  birthplace_region VARCHAR(100),
  educational_attainment VARCHAR(100),
  parent_guardian_name VARCHAR(200),
  parent_guardian_address VARCHAR(255),
  client_classification VARCHAR(100),
  disability_type VARCHAR(100),
  disability_cause VARCHAR(100),
  course_qualification VARCHAR(255),
  scholarship_type VARCHAR(100),
  privacy_consent BOOLEAN,
  photo_path VARCHAR(255),
  encoded_by VARCHAR(9),
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (encoded_by) REFERENCES users(id)
);

-- Audit trail
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(9),
  action VARCHAR(100),
  details TEXT,
  ip_address VARCHAR(50),
  created_at DATETIME DEFAULT NOW()
);