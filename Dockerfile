FROM cs50/server:focal

# Default port (to match CS50 IDE)
EXPOSE 8080

WORKDIR /var/www
RUN npm install
