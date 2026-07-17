CREATE TABLE game_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    played_at DATETIME(6) NOT NULL,
    game_type VARCHAR(30) NOT NULL,
    game_mode VARCHAR(30) NOT NULL,
    my_score INT NOT NULL,
    opponent_score INT NOT NULL,
    innings INT NOT NULL,
    high_run INT NOT NULL,
    average DECIMAL(10, 3) NOT NULL,
    is_win BOOLEAN NOT NULL,
    player_count INT NOT NULL,
    rank_value INT NULL,
    last_three_cushions INT NULL,
    notes VARCHAR(1000) NULL,
    opponent_name VARCHAR(100) NULL,
    my_cushion_score INT NULL,
    opponent_cushion_score INT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX idx_game_records_played_at_id
    ON game_records (played_at, id);

CREATE TABLE game_record_inning_scores (
    game_record_id BIGINT NOT NULL,
    score_order INT NOT NULL,
    score INT NOT NULL,
    PRIMARY KEY (game_record_id, score_order),
    CONSTRAINT fk_game_record_inning_scores_game_record
        FOREIGN KEY (game_record_id)
        REFERENCES game_records (id)
        ON DELETE CASCADE
);
