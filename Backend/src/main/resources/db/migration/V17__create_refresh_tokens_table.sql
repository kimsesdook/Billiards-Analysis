CREATE TABLE refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    family_id VARCHAR(36) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    replaced_by_token_hash VARCHAR(64) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_refresh_tokens_member
        FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uk_refresh_tokens_token_hash
    ON refresh_tokens (token_hash);

CREATE INDEX idx_refresh_tokens_member
    ON refresh_tokens (member_id);

CREATE INDEX idx_refresh_tokens_family
    ON refresh_tokens (family_id);

CREATE INDEX idx_refresh_tokens_expires_at
    ON refresh_tokens (expires_at);
