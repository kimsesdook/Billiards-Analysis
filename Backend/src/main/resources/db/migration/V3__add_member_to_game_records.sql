ALTER TABLE game_records
    ADD COLUMN member_id BIGINT NULL;

CREATE INDEX idx_game_records_member_played_at_id
    ON game_records (member_id, played_at, id);

ALTER TABLE game_records
    ADD CONSTRAINT fk_game_records_member
    FOREIGN KEY (member_id)
    REFERENCES members (id);
