CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_resource_type VARCHAR(50),
    related_resource_id BIGINT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_member
        FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE INDEX idx_notifications_member_created_at
    ON notifications (member_id, created_at);

CREATE INDEX idx_notifications_member_read
    ON notifications (member_id, is_read);
