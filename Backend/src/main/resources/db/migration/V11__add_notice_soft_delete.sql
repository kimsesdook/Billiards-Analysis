ALTER TABLE notices
    ADD COLUMN deleted_at DATETIME(6) NULL;

ALTER TABLE notices
    ADD COLUMN deleted_by_member_id BIGINT NULL;

ALTER TABLE notices
    ADD CONSTRAINT fk_notices_deleted_by_member
        FOREIGN KEY (deleted_by_member_id)
        REFERENCES members (id)
        ON DELETE SET NULL;

CREATE INDEX idx_notices_visible_order
    ON notices (deleted_at, is_important, published_at, id);
