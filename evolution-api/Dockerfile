FROM atendai/evolution-api:v1.8.7

# Apply the @lid JID patch so Evolution API can send to WhatsApp multi-device JIDs
COPY whatsapp.baileys.service.patched.js /evolution/dist/src/api/services/channels/whatsapp.baileys.service.js

EXPOSE 8080
