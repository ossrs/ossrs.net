#
# From HTTPX web server.
FROM ossrs/httpx:1
# HTTP/80, HTTPS/443
EXPOSE 80 443
# It's ok to COPY multiple files.
COPY index.html crossdomain.xml favicon.ico privacy privacy_cn nginx.html 50x.html /usr/local/srs.release/
COPY k8s/k8s.go.foo.yaml /usr/local/srs.release/k8s/
# Should never copy directories by COPY, instead we should use cp.
COPY http-rest /usr/local/srs.release/http-rest
COPY images /usr/local/srs.release/images
COPY releases  /usr/local/srs.release/releases
COPY srs-console  /usr/local/srs.release/srs-console
COPY trunk  /usr/local/srs.release/trunk
COPY donation  /usr/local/srs.release/donation
COPY wiki  /usr/local/srs.release/wiki
COPY webrtc-web /usr/local/srs.release/webrtc-web
# Create links for Compatibility.
RUN cd /usr/local/srs.release && ln -sf . srs.release && \
    ln -sf trunk/research/console && ln -sf trunk/research/players && \
    ln -sf trunk/3rdparty/signaling/www/demos && \
    ln -sf images/srs-256x256.svg srs.svg && \
    ln -sf images/srs-200x200.png srs.png
# Default workdir and command.
WORKDIR /usr/local
CMD ["./bin/httpx-static", \
    "-http", "80", "-root", "./srs.release" \
    ]
