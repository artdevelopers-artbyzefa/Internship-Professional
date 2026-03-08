export default {
    async fetch(request) {
        return new Response("Internship Portal API is running 🚀", {
            headers: { "content-type": "text/plain" }
        });
    }
};
