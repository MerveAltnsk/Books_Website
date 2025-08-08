import pg from 'pg';

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Books",
    password: "1234",
    port: 5432,
});

async function updateBookCovers() {
    try {
        await db.connect();
        console.log("Connected to database");
        
        const books = await db.query('SELECT id, title FROM books WHERE cover_image IS NULL OR cover_image = \'\'');
        console.log(`Found ${books.rows.length} books that need cover images`);
        
        for (const book of books.rows) {
            const coverImage = `https://source.unsplash.com/800x1200/?book,dark,${encodeURIComponent(book.title.split(' ')[0])}`;
            await db.query(
                'UPDATE books SET cover_image = $1 WHERE id = $2',
                [coverImage, book.id]
            );
            console.log(`Updated cover for: ${book.title}`);
        }
        
        console.log('All book covers updated successfully');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.end();
    }
}

updateBookCovers();
