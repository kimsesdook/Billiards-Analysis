CREATE TABLE contact_inquiries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    inquiry_status VARCHAR(30) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_contact_inquiries_member
        FOREIGN KEY (member_id)
        REFERENCES members (id)
        ON DELETE CASCADE
);

CREATE INDEX idx_contact_inquiries_member_created_at
    ON contact_inquiries (member_id, created_at);

CREATE INDEX idx_contact_inquiries_public_created_at
    ON contact_inquiries (is_private, created_at);
