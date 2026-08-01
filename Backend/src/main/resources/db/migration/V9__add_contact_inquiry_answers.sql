ALTER TABLE contact_inquiries
    ADD COLUMN answer_content TEXT NULL;

ALTER TABLE contact_inquiries
    ADD COLUMN answered_at DATETIME(6) NULL;

ALTER TABLE contact_inquiries
    ADD COLUMN answered_by_member_id BIGINT NULL;

ALTER TABLE contact_inquiries
    ADD CONSTRAINT fk_contact_inquiries_answered_by_member
        FOREIGN KEY (answered_by_member_id)
        REFERENCES members (id)
        ON DELETE SET NULL;

CREATE INDEX idx_contact_inquiries_answered_by_member
    ON contact_inquiries (answered_by_member_id);
