import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Function to fetch book details and generate a cover image URL
async function fetchBookDetails(title, author) {
    try {
        // Generate a unique but consistent image for each book using Unsplash source
        const imageUrl = `https://source.unsplash.com/800x1200/?dark,${encodeURIComponent(title.split(' ')[0])},mystical`;
        
        return {
            title: title,
            author: author || 'Unknown',
            description: '',
            coverImage: imageUrl,
            publishedDate: null,
            pageCount: null,
            categories: [],
            averageRating: null
        };
    } catch (error) {
        console.error('Error fetching book details:', error);
        return null;
    }
}

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Books",
  password: "1234",
  port: 5432,
});

// Connect to database
try {
  await db.connect();
  console.log("Successfully connected to the database");
  
  // Create the books table if it doesn't exist
  console.log("Creating books table if it doesn't exist...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      rate DECIMAL(3,1),
      date DATE,
      notes TEXT,
      cover_image TEXT,
      description TEXT,
      published_date VARCHAR(50),
      page_count INTEGER,
      categories TEXT[],
      average_rating DECIMAL(2,1),
      quote TEXT
    )
  `);

  // Check if we need to seed initial data
  const count = await db.query('SELECT COUNT(*) FROM books');
  if (count.rows[0].count === '0') {
    // Seed initial books data
    const sampleBooks = [
      {
        title: "Love from God",
        description: "God will always love us, but God cannot redeem our sins. There are many human sins, including greed, anger, and delusion. God can only watch you make a pact with the devil.",
        quote: "In the depths of darkness, even divine love has its limits."
      },
      {
        title: "Pandora",
        description: "Pandora's Box is not a test from God. But it is just an excuse to crush humans or will the mercy of God be similar to that of the devil?",
        quote: "Dion he would pour a sweet wine to begin with and finish with a dark chocolate called Despair"
      },
    ];

    for (const book of sampleBooks) {
      try {
        const bookDetails = await fetchBookDetails(book.title, '');
        await db.query(
          `INSERT INTO books (
            title, description, quote,
            cover_image, author, published_date,
            page_count, average_rating
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            book.title,
            book.description,
            book.quote,
            `https://raw.githubusercontent.com/MerveAltnsk/Books_Website/main/public/assets/covers/${book.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
            bookDetails?.author || 'Unknown',
            bookDetails?.publishedDate || null,
            bookDetails?.pageCount || null,
            bookDetails?.averageRating || null
          ]
        );
      } catch (error) {
        console.error(`Error seeding book ${book.title}:`, error);
      }
    }
  }
} catch (err) {
  console.error("Error connecting to the database:", err);
}

let books = [];

// GET home page
app.get("/", async (req, res) => {
    try {
        console.log("Fetching books from database...");
        const result = await db.query("SELECT * FROM books ORDER BY title");
        books = result.rows || [];  // Ensure books is always an array
        
        // Update any books that don't have cover images
        for (const book of books) {
            if (!book.cover_image) {
                book.cover_image = `https://source.unsplash.com/800x1200/?book,dark,${encodeURIComponent(book.title.split(' ')[0])}`;
                await db.query(
                    'UPDATE books SET cover_image = $1 WHERE id = $2',
                    [book.cover_image, book.id]
                );
            }
        }
        
        console.log(`Found ${books.length} books in the database`);
        // Log the first book's details to check the cover_image field
        if (books.length > 0) {
            console.log("Sample book data:", {
                title: books[0].title,
                cover_image: books[0].cover_image
            });
        }
        res.render("index.ejs", { 
            books,
            error: null,
            success: null
        });
    } catch (error) {
        console.error("Error fetching books:", error);
        res.render("index.ejs", { 
            books: [],
            error: "Error loading books. Please try again later."
        });
    }
});


// POST search books
app.post("/search", async (req, res) => {
    const searchTerm = req.body.searchTerm;
    try {
        const result = await db.query(
            `SELECT * FROM books 
            WHERE title ILIKE $1 
            OR author ILIKE $1 
            OR description ILIKE $1 
            ORDER BY title`,
            [`%${searchTerm}%`]
        );
        books = result.rows || [];
        res.render("index.ejs", { 
            books,
            error: null 
        });
    } catch (error) {
        console.error("Error searching books:", error);
        res.render("index.ejs", { 
            books: [],
            error: "Error searching books. Please try again." 
        });
    }
});

// POST sort books
app.post("/sort", async (req, res) => {
    const order = req.body.order;
    let query = "SELECT * FROM books";
    
    if (order === "rate") {
        query += " ORDER BY rate DESC";
    } else if (order === "date") {
        query += " ORDER BY date DESC";
    }

    try {
        const result = await db.query(query);
        books = result.rows || [];
        res.render("index.ejs", { 
            books,
            error: null 
        });
    } catch (error) {
        console.error("Error sorting books:", error);
        res.render("index.ejs", { 
            books: [],
            error: "Error sorting books. Please try again." 
        });
    }
});

// POST add book
app.post("/add", async (req, res) => {
    const { title, author, rate, date, notes, cover_image, page_count, average_rating } = req.body;
    try {
        // Insert book with all fields from the form
        await db.query(
            `INSERT INTO books (
                title, author, rate, date, notes, 
                cover_image, quote, page_count, 
                average_rating
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                title,
                author,
                rate,
                date,
                notes,
                cover_image || null,
                notes?.split('\n')[0] || null, // Use first line of notes as quote if provided
                page_count || null,
                average_rating || null
            ]
        );

        // After successful insert, fetch all books and render the page
        const result = await db.query("SELECT * FROM books ORDER BY title");
        books = result.rows || [];
        res.render("index.ejs", { 
            books,
            error: null,
            success: "Book added successfully!"
        });
    } catch (error) {
        console.error("Error adding book:", error);
        // On error, render the page with the error message
        res.render("index.ejs", { 
            books: books || [],
            error: "Error adding book. Please try again.",
            success: null
        });
    }
});

// POST edit book
app.post("/edit", async (req, res) => {
    try {
        const { id, title, author, rate, date, notes, quote, cover_image } = req.body;
        await db.query(
            `UPDATE books 
             SET title = $1, author = $2, rate = $3, date = $4, notes = $5, quote = $6, cover_image = $7
             WHERE id = $8`,
            [title, author, rate, date, notes, quote, cover_image, id]
        );
        res.redirect('/?success=Book updated successfully');
    } catch (error) {
        console.error('Error updating book:', error);
        res.redirect('/?error=Failed to update book');
    }
});

// POST delete book
app.post("/delete", async (req, res) => {
    const bookId = req.body.bookId;
    try {
        await db.query("DELETE FROM books WHERE id = $1", [bookId]);
        res.redirect("/");
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).send("Internal Server Error");
    }
});

// POST update book
app.post("/update", async (req, res) => {
    const { bookId, title, author, rate, date, notes, cover_image, page_count, average_rating } = req.body;
    try {
        await db.query(
            `UPDATE books 
             SET title = $1, author = $2, rate = $3, date = $4, 
                 notes = $5, cover_image = $6, quote = $7,
                 page_count = $8, average_rating = $9
             WHERE id = $10`,
            [
                title,
                author,
                rate,
                date,
                notes,
                cover_image || null,
                notes?.split('\n')[0] || null, // Use first line of notes as quote if provided
                page_count || null,
                average_rating || null,
                bookId
            ]
        );
        
        // After successful update, fetch all books and render the page
        const result = await db.query("SELECT * FROM books ORDER BY title");
        books = result.rows || [];
        res.render("index.ejs", { 
            books,
            error: null,
            success: "Book updated successfully!"
        });
    } catch (error) {
        console.error("Error updating book:", error);
        res.render("index.ejs", { 
            books: books || [],
            error: "Error updating book. Please try again.",
            success: null
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
