SET @users_table_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
);

SET @backfill_user_email_sql := IF(
    @users_table_exists > 0,
    "UPDATE users SET email = CONCAT('missing-email-user-', id, '@studyhub.local') WHERE email IS NULL OR TRIM(email) = ''",
    "SELECT 1"
);
PREPARE stmt FROM @backfill_user_email_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @enforce_user_email_sql := IF(
    @users_table_exists > 0,
    "ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL",
    "SELECT 1"
);
PREPARE stmt FROM @enforce_user_email_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @status_column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'account_status'
);

SET @add_user_status_sql := IF(
    @users_table_exists > 0 AND @status_column_exists = 0,
    "ALTER TABLE users ADD COLUMN account_status VARCHAR(20) NULL",
    "SELECT 1"
);
PREPARE stmt FROM @add_user_status_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @backfill_user_status_sql := IF(
    @users_table_exists > 0,
    "UPDATE users SET account_status = 'ACTIVE' WHERE account_status IS NULL OR TRIM(account_status) = ''",
    "SELECT 1"
);
PREPARE stmt FROM @backfill_user_status_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @plus_request_column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'plus_upgrade_requested'
);

SET @add_plus_request_sql := IF(
    @users_table_exists > 0 AND @plus_request_column_exists = 0,
    "ALTER TABLE users ADD COLUMN plus_upgrade_requested BOOLEAN NULL",
    "SELECT 1"
);
PREPARE stmt FROM @add_plus_request_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @backfill_plus_request_sql := IF(
    @users_table_exists > 0,
    "UPDATE users SET plus_upgrade_requested = 0 WHERE plus_upgrade_requested IS NULL",
    "SELECT 1"
);
PREPARE stmt FROM @backfill_plus_request_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @enforce_plus_request_sql := IF(
    @users_table_exists > 0,
    "ALTER TABLE users MODIFY COLUMN plus_upgrade_requested BOOLEAN NOT NULL DEFAULT FALSE",
    "SELECT 1"
);
PREPARE stmt FROM @enforce_plus_request_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @quiz_question_table_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_question'
);

SET @quiz_question_explanation_column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_question' AND COLUMN_NAME = 'explanation'
);

SET @add_quiz_question_explanation_sql := IF(
    @quiz_question_table_exists > 0 AND @quiz_question_explanation_column_exists = 0,
    "ALTER TABLE quiz_question ADD COLUMN explanation VARCHAR(2000) NULL",
    "SELECT 1"
);
PREPARE stmt FROM @add_quiz_question_explanation_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @quiz_result_table_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_result'
);

SET @quiz_result_answer_table_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_result_answer'
);

SET @create_quiz_result_answer_sql := IF(
    @quiz_result_table_exists > 0 AND @quiz_result_answer_table_exists = 0,
    "CREATE TABLE quiz_result_answer (id BIGINT NOT NULL AUTO_INCREMENT, quiz_result_id BIGINT NOT NULL, question_id BIGINT NOT NULL, chosen_option_id BIGINT NULL, correct_option_id BIGINT NULL, is_correct BIT(1) NOT NULL, PRIMARY KEY (id), CONSTRAINT uk_quiz_result_answer_result_question UNIQUE (quiz_result_id, question_id), CONSTRAINT fk_quiz_result_answer_result FOREIGN KEY (quiz_result_id) REFERENCES quiz_result (id), CONSTRAINT fk_quiz_result_answer_question FOREIGN KEY (question_id) REFERENCES quiz_question (id), CONSTRAINT fk_quiz_result_answer_chosen_option FOREIGN KEY (chosen_option_id) REFERENCES quiz_option (id), CONSTRAINT fk_quiz_result_answer_correct_option FOREIGN KEY (correct_option_id) REFERENCES quiz_option (id))",
    "SELECT 1"
);
PREPARE stmt FROM @create_quiz_result_answer_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
