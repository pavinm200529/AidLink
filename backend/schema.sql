-- MySQL Schema for AidLink Disaster Resource Management System

CREATE DATABASE IF NOT EXISTS aidlink;
USE aidlink;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'volunteer', 'requester', 'government', 'ngo') NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    status ENUM('READY', 'BUSY', 'OFFLINE') DEFAULT 'READY'
);

-- Table: disasters
CREATE TABLE IF NOT EXISTS disasters (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    date DATETIME,
    state ENUM('reported', 'verified', 'active', 'resolved') DEFAULT 'reported',
    reporter_id VARCHAR(50),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: resource_requests
CREATE TABLE IF NOT EXISTS resource_requests (
    id VARCHAR(50) PRIMARY KEY,
    disaster_id VARCHAR(50),
    requester_name VARCHAR(100) NOT NULL,
    resources JSON, -- JSON array of requested items
    contact VARCHAR(100),
    priority VARCHAR(50),
    location VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected', 'fulfilled', 'assigned', 'resolved') DEFAULT 'pending',
    admin_response TEXT,
    date DATETIME,
    submitted_by_id VARCHAR(50),
    FOREIGN KEY (disaster_id) REFERENCES disasters(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: volunteer_assignments
CREATE TABLE IF NOT EXISTS volunteer_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50),
    volunteer_id VARCHAR(50),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES resource_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50),
    sender_id VARCHAR(50),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES resource_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: resources
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 0,
    location VARCHAR(255),
    notes TEXT,
    date DATETIME
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(50),
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: volunteers (specialized registrations)
CREATE TABLE IF NOT EXISTS volunteers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(100) NOT NULL,
    skills TEXT,
    availability VARCHAR(50),
    date DATETIME
);
