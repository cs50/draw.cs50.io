FROM cs50/server

# Default port (to match CS50 IDE)
EXPOSE 8080

WORKDIR /var/www
RUN npm install --loglevel verbose
RUN pwd && ls
