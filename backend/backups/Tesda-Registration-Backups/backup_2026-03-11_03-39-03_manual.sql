-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: localhost    Database: tesda_registration
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(9) DEFAULT NULL,
  `user_name` varchar(150) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(50) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,'202600001','System Administrator','CREATE_BACKUP','Backup','Created: backup_2026-03-11_02-39-20_manual.sql','127.0.0.1','2026-03-11 10:39:21'),(2,'202600001','System Administrator','CREATE_BACKUP','Backup','Created: backup_2026-03-11_02-39-23_manual.sql','127.0.0.1','2026-03-11 10:39:23'),(3,'202600001','System Administrator','DELETE_BACKUP','Backup','Deleted: backup_2026-03-11_02-39-23_manual.sql','127.0.0.1','2026-03-11 10:40:53'),(4,'202600001','System Administrator','DELETE_BACKUP','Backup','Deleted: backup_2026-03-11_02-39-20_manual.sql','127.0.0.1','2026-03-11 10:40:55'),(5,'202600001','System Administrator','CREATE_BACKUP','Backup','Created: backup_2026-03-11_02-40-58_manual.sql','127.0.0.1','2026-03-11 10:40:59'),(6,'202600001','System Administrator','DELETE_BACKUP','Backup','Deleted: backup_2026-03-11_02-40-58_manual.sql','127.0.0.1','2026-03-11 11:19:53'),(7,'202600001','System Administrator','CREATE_BACKUP','Backup','Created: backup_2026-03-11_03-19-56_manual.sql','127.0.0.1','2026-03-11 11:19:56'),(8,'202600001','System Administrator','LOGOUT','Auth','Session ended for admin','127.0.0.1','2026-03-11 11:20:06'),(9,'202600001','System Administrator','LOGIN','Auth','Logged in as admin · 7-day session','127.0.0.1','2026-03-11 11:20:19'),(10,'202600001','System Administrator','CREATE_BACKUP','Backup','Created: backup_2026-03-11_03-35-06_manual.sql','127.0.0.1','2026-03-11 11:35:06'),(11,'202600001','System Administrator','DELETE_BACKUP','Backup','Deleted: backup_2026-03-11_03-35-06_manual.sql','127.0.0.1','2026-03-11 11:39:00'),(12,'202600001','System Administrator','DELETE_BACKUP','Backup','Deleted: backup_2026-03-11_03-19-56_manual.sql','127.0.0.1','2026-03-11 11:39:01');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_logs`
--

DROP TABLE IF EXISTS `backup_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) DEFAULT NULL,
  `size_kb` int(11) DEFAULT NULL,
  `performed_by` varchar(9) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_logs`
--

LOCK TABLES `backup_logs` WRITE;
/*!40000 ALTER TABLE `backup_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `backup_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backup_settings`
--

DROP TABLE IF EXISTS `backup_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backup_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backup_settings`
--

LOCK TABLES `backup_settings` WRITE;
/*!40000 ALTER TABLE `backup_settings` DISABLE KEYS */;
INSERT INTO `backup_settings` VALUES ('backup_retention','14'),('backup_schedule','daily'),('backup_time','02:00');
/*!40000 ALTER TABLE `backup_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'Computer Systems Servicing NC II','CSS-NC2','ICT',1,'2026-03-11 09:44:28'),(2,'Bread and Pastry Production NC II','BPP-NC2','Food and Beverage',1,'2026-03-11 09:44:28'),(3,'Caregiving NC II','CG-NC2','Health Social and Other Community Development Services',1,'2026-03-11 09:44:28'),(4,'Electrical Installation and Maintenance NC II','EIM-NC2','Electrical and Electronics',1,'2026-03-11 09:44:28'),(5,'Cookery NC II','COOK-NC2','Food and Beverage',1,'2026-03-11 09:44:28'),(6,'Shielded Metal Arc Welding NC I','SMAW-NC1','Metals and Engineering',1,'2026-03-11 09:44:28'),(7,'Driving NC II','DRV-NC2','Land Transportation',1,'2026-03-11 09:44:28'),(8,'Hairdressing NC II','HD-NC2','Wholesale and Retail Trading / Services',1,'2026-03-11 09:44:28');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registration`
--

DROP TABLE IF EXISTS `registration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uli_number` varchar(25) DEFAULT NULL COMMENT 'T2MIS Auto Generated',
  `entry_date` date DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `extension_name` varchar(20) DEFAULT NULL COMMENT 'Jr., Sr., etc.',
  `address_subdivision` varchar(255) DEFAULT NULL COMMENT 'Subdivision or Condominium name (optional)',
  `address_street` varchar(255) DEFAULT NULL,
  `address_barangay` varchar(100) DEFAULT NULL,
  `address_city` varchar(100) DEFAULT NULL,
  `address_province` varchar(100) DEFAULT NULL,
  `address_region` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_no` varchar(20) DEFAULT NULL,
  `nationality` varchar(50) DEFAULT 'Filipino',
  `sex` enum('Male','Female') DEFAULT NULL,
  `civil_status` enum('Single','Married','Separated/Divorced/Annulled','Widow/er','Common Law/Live-in') DEFAULT NULL,
  `employment_status` enum('Wage-Employed','Underemployed','Self-Employed','Unemployed') DEFAULT NULL,
  `employment_type` enum('None','Regular','Casual','Job Order','Probationary','Permanent','Contractual','Temporary') DEFAULT 'None',
  `birth_month` varchar(20) DEFAULT NULL,
  `birth_day` tinyint(3) unsigned DEFAULT NULL,
  `birth_year` year(4) DEFAULT NULL,
  `age` tinyint(3) unsigned DEFAULT NULL,
  `birthplace_city` varchar(100) DEFAULT NULL,
  `birthplace_province` varchar(100) DEFAULT NULL,
  `birthplace_region` varchar(100) DEFAULT NULL,
  `educational_attainment` varchar(150) DEFAULT NULL,
  `parent_guardian_name` varchar(200) DEFAULT NULL,
  `parent_guardian_address` varchar(255) DEFAULT NULL,
  `client_classification` varchar(100) DEFAULT NULL,
  `has_disability` tinyint(1) NOT NULL DEFAULT 0,
  `disability_type` varchar(100) DEFAULT NULL,
  `disability_cause` varchar(50) DEFAULT NULL,
  `course_qualification` varchar(255) DEFAULT NULL,
  `scholarship_type` varchar(100) DEFAULT NULL,
  `privacy_consent` tinyint(1) DEFAULT 0,
  `id_photo_path` varchar(255) DEFAULT NULL,
  `photo_1x1_path` varchar(255) DEFAULT NULL,
  `encoded_by` varchar(9) DEFAULT NULL,
  `status` enum('active','archived') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uli_number` (`uli_number`),
  KEY `encoded_by` (`encoded_by`),
  CONSTRAINT `registration_ibfk_1` FOREIGN KEY (`encoded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registration`
--

LOCK TABLES `registration` WRITE;
/*!40000 ALTER TABLE `registration` DISABLE KEYS */;
/*!40000 ALTER TABLE `registration` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(9) NOT NULL COMMENT 'Employee ID: 4-digit year + 5 digits',
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','encoder') NOT NULL DEFAULT 'encoder',
  `full_name` varchar(150) DEFAULT NULL,
  `security_question` varchar(255) DEFAULT NULL COMMENT 'Admin only',
  `security_answer_hash` varchar(255) DEFAULT NULL COMMENT 'Admin only - hashed',
  `reset_ticket` varchar(8) DEFAULT NULL COMMENT 'Encoder only - 8-char reset ticket',
  `ticket_expires_at` datetime DEFAULT NULL COMMENT 'Ticket expiry',
  `ticket_used` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('202600001','admin','admin@tesda-noveleta.gov.ph','$2b$10$xUWElhgQurTSaDm1cVu.cuIgaTdlnBeH8uCh7Y9QXgbGEVSdUdkgi','admin','System Administrator','What is the name of your first school?','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyYnB.CVu',NULL,NULL,0,1,'2026-03-11 11:20:19','2026-03-11 09:44:28','2026-03-11 11:20:19'),('202600002','encoder1','encoder1@tesda-noveleta.gov.ph','$2b$10$MjcI3dtNCAMYcnbPx7q1ZO.iOSmSmm/QiiRmfCueQaeNNZ1BpIgM.','encoder','Data Encoder 1',NULL,NULL,NULL,NULL,0,1,NULL,'2026-03-11 09:44:28','2026-03-11 09:44:28'),('202600003','encoder2',NULL,'$2b$10$MjcI3dtNCAMYcnbPx7q1ZO.iOSmSmm/QiiRmfCueQaeNNZ1BpIgM.','encoder','Data Encoder 2',NULL,NULL,NULL,NULL,0,1,NULL,'2026-03-11 09:44:28','2026-03-11 09:44:28');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-11 11:39:03
