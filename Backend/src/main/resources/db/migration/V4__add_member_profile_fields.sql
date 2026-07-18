ALTER TABLE members
    ADD COLUMN display_name VARCHAR(30) NOT NULL DEFAULT 'Player';

ALTER TABLE members
    ADD COLUMN target_cushion_count INT NOT NULL DEFAULT 1;

ALTER TABLE members
    ADD COLUMN three_ball_handicap INT NOT NULL DEFAULT 200;

ALTER TABLE members
    ADD COLUMN four_ball_handicap INT NOT NULL DEFAULT 250;

UPDATE members
SET display_name = nickname
WHERE display_name = 'Player';
