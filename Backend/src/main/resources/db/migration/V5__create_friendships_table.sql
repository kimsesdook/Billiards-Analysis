CREATE TABLE friendships (
    id BIGINT NOT NULL AUTO_INCREMENT,
    requester_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    member_low_id BIGINT NOT NULL,
    member_high_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_friendships_requester
        FOREIGN KEY (requester_id) REFERENCES members (id),
    CONSTRAINT fk_friendships_receiver
        FOREIGN KEY (receiver_id) REFERENCES members (id)
);

CREATE UNIQUE INDEX uk_friendships_member_pair
    ON friendships (member_low_id, member_high_id);

CREATE INDEX idx_friendships_requester_status
    ON friendships (requester_id, status);

CREATE INDEX idx_friendships_receiver_status
    ON friendships (receiver_id, status);
