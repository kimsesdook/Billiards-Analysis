CREATE TABLE notices (
    id BIGINT NOT NULL AUTO_INCREMENT,
    author_member_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    notice_category VARCHAR(30) NOT NULL,
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    published_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_notices_author_member
        FOREIGN KEY (author_member_id)
        REFERENCES members (id)
);

CREATE INDEX idx_notices_important_published_at
    ON notices (is_important, published_at);
