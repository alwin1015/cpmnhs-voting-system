CREATE DATABASE IF NOT EXISTS cpmnhs_voting;
USE cpmnhs_voting;

-- Admins Table
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin account (password: admin123)
-- Replace with a secure hashed password in production (e.g., using password_hash() in PHP)
INSERT INTO admins (username, email, password_hash) VALUES ('admin', 'admin@cpmnhs.edu.ph', 'admin123');

-- Sections Table
CREATE TABLE sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    grade_level VARCHAR(20) NOT NULL
);

-- Positions Table
CREATE TABLE positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    display_order INT NOT NULL,
    max_votes INT DEFAULT 1
);

-- Insert Default 12 Positions
INSERT INTO positions (name, display_order, max_votes) VALUES
('President', 1, 1),
('Vice President', 2, 1),
('Secretary', 3, 1),
('Treasurer', 4, 1),
('Auditor', 5, 1),
('Public Information Officer', 6, 1),
('Protocol Officer', 7, 1),
('Grade 7 Representative', 8, 1),
('Grade 8 Representative', 9, 1),
('Grade 9 Representative', 10, 1),
('Grade 10 Representative', 11, 1),
('Grade 11 Representative', 12, 1),
('Grade 12 Representative', 13, 1);

-- Voters Table (Students)
CREATE TABLE voters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lrn VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    section VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    has_voted BOOLEAN DEFAULT FALSE,
    voted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Candidates Table
CREATE TABLE candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    position_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    party VARCHAR(100) NOT NULL,
    motto TEXT,
    photo_url VARCHAR(255),
    grade_level VARCHAR(20) NOT NULL,
    section VARCHAR(50) NOT NULL,
    votes INT DEFAULT 0,
    FOREIGN KEY (position_id) REFERENCES positions(id)
);

-- Votes Ledger Table
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voter_id INT NOT NULL,
    candidate_id INT NOT NULL,
    position_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voter_id) REFERENCES voters(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    FOREIGN KEY (position_id) REFERENCES positions(id)
);

-- Election Settings Table
CREATE TABLE election_settings (
    id INT PRIMARY KEY DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT FALSE
);

INSERT INTO election_settings (id, name, school_year, start_date, end_date, is_active) 
VALUES (1, 'SSG General Election', '2026-2027', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), TRUE);
