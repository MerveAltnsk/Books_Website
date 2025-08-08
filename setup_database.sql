DROP TABLE IF EXISTS books;

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    rate DECIMAL(3,1),
    date DATE,
    notes TEXT,
    cover_image TEXT,
    description TEXT,
    published_date DATE,
    page_count INTEGER,
    categories TEXT[],
    average_rating DECIMAL(3,2)
);
