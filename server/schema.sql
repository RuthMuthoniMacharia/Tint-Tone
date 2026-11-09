-- Tint & Tone: database schema (MySQL)
-- Column names match the existing routes in server/index.js
CREATE DATABASE IF NOT EXISTS tint_tone;
USE tint_tone;

-- Users (parent of Customer and Administrator)
CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('customer','admin','super_admin') NOT NULL DEFAULT 'customer',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer-specific details (1:1 with users)
CREATE TABLE customers (
    user_id          INT PRIMARY KEY,
    shipping_address VARCHAR(255),
    phone_number     VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Administrator-specific details (1:1 with users)
CREATE TABLE administrators (
    user_id       INT PRIMARY KEY,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Password reset tokens (forgot password)
CREATE TABLE password_resets (
    reset_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE products (
    product_id     INT AUTO_INCREMENT PRIMARY KEY,
    category_id    INT NOT NULL,
    name           VARCHAR(120) NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url      VARCHAR(255) DEFAULT 'default.png',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE orders (
    order_id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    order_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount     DECIMAL(10,2) NOT NULL,
    order_status     ENUM('Processing','Packed','Shipped','Delivered','Cancelled')
                     NOT NULL DEFAULT 'Processing',
    shipping_address VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Order line items (resolves Order <-> Product many-to-many)
CREATE TABLE order_details (
    order_detail_id    INT AUTO_INCREMENT PRIMARY KEY,
    order_id           INT NOT NULL,
    product_id         INT NOT NULL,
    quantity           INT NOT NULL CHECK (quantity > 0),
    unit_price_at_sale DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- One payment per order
CREATE TABLE payments (
    payment_id      INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL UNIQUE,
    payment_method  ENUM('mpesa','card') NOT NULL,
    transaction_ref VARCHAR(60),
    amount          DECIMAL(10,2) NOT NULL,
    payment_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status  ENUM('Pending','Paid','Failed') NOT NULL DEFAULT 'Pending',
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Audit trail of admin actions
CREATE TABLE audit_logs (
    log_id        INT AUTO_INCREMENT PRIMARY KEY,
    admin_id      INT NOT NULL,
    action_type   VARCHAR(40) NOT NULL,
    target_entity VARCHAR(40),
    target_id     INT,
    details       VARCHAR(255),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id)
);

-- Starter data
INSERT INTO categories (name, description) VALUES
    ('Skincare', 'Cleansers, serums, moisturisers'),
    ('Make-up',  'Face, lips and eyes');