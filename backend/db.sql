CREATE TABLE users (
  id varchar(11) NOT NULL,
  email varchar(255) NOT NULL,
  name varchar(255),
  given_name varchar(100),
  family_name varchar(100),
  picture text,
  role enum('user','admin') DEFAULT 'user',
  status enum('active','locked') DEFAULT 'active',
  login_count int DEFAULT 0,
  points int DEFAULT 0,
  level enum('BRONZE','SILVER','GOLD','DIAMOND') DEFAULT 'BRONZE',
  email_verified tinyint(1) DEFAULT 0,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE categories (
  id varchar(11) NOT NULL,
  name varchar(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE products (
  id varchar(11) NOT NULL,
  category_id varchar(11) NOT NULL,
  name varchar(255) NOT NULL,
  price decimal(15,2) NOT NULL,
  stock int DEFAULT 0,
  image text,
  description text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE orders (
  id varchar(11) NOT NULL,
  user_id varchar(11) NOT NULL,
  total_amount decimal(15,2) NOT NULL,
  discount_amount decimal(15,2) DEFAULT 0,
  final_amount decimal(15,2) NOT NULL,
  points_earned int DEFAULT 0,
  status enum('pending','shipping','completed','cancelled') DEFAULT 'pending',
  shipping_name varchar(255),
  shipping_phone varchar(20),
  shipping_address text,
  note text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_idx (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE order_items (
  id varchar(11) NOT NULL,
  order_id varchar(11) NOT NULL,
  product_id varchar(11) NOT NULL,
  quantity int NOT NULL,
  price decimal(15,2) NOT NULL,
  PRIMARY KEY (id),
  KEY order_idx (order_id),
  KEY product_idx (product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
