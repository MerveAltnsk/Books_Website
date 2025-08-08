const getBookCover = (title, size = 'L') => {
    // Clean the title and create a search-friendly version
    const cleanTitle = title.toLowerCase()
        .replace(/[^a-z0-9]/g, '+')
        .replace(/\++/g, '+')
        .trim();

    // Construct the Open Library cover URL
    return `https://covers.openlibrary.org/b/title/${cleanTitle}-${size}.jpg`;
};

// Export the function
export { getBookCover };
