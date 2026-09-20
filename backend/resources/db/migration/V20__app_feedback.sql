-- Admin -> Feedback: lets any signed-in user send a complaint/suggestion about
-- the app itself to the admin team. Anyone can submit; only admins can read
-- the list back (see main.py's GET/POST /api/feedback).
CREATE TABLE app_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  scope_type VARCHAR(32) NOT NULL,
  scope_value VARCHAR(255) NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL
);
