# 🚀 Lino.AI VPS Deployment Guide

Complete guide to deploy your Lino.AI chatbot with Ollama on Ubuntu VPS.

## 📋 Prerequisites

- Ubuntu VPS (Oracle Cloud Free Tier recommended)
- SSH access to your VPS
- Domain name (optional but recommended)

## 🎯 Step-by-Step Deployment

### Step 1: Create Oracle Cloud VPS

1. **Sign up for Oracle Cloud Free Tier**
   - Go to [Oracle Cloud](https://www.oracle.com/cloud/free/)
   - Create account and verify email
   - Add payment method (required but won't charge)

2. **Create Ubuntu Instance**
   - Launch Ubuntu 22.04 LTS
   - Choose 1GB RAM, 50GB storage
   - Configure security rules:
     - SSH (port 22)
     - HTTP (port 80)
     - HTTPS (port 443)
   - Note your public IP address

### Step 2: Upload Files to VPS

```bash
# From your local machine
scp -r vps-api-server/ ubuntu@your-vps-ip:~/
```

### Step 3: Run Setup Script

```bash
# SSH into your VPS
ssh ubuntu@your-vps-ip

# Navigate to the folder
cd vps-api-server

# Make setup script executable
chmod +x setup-vps.sh

# Run the setup script
./setup-vps.sh
```

**⚠️ Important:** The script will take 10-15 minutes and generate an API key. Save this key!

### Step 4: Get Your API Key

After the setup completes, you'll see output like:
```
Generated secure API key: abc123def456...
```

**Save this API key!** You'll need it for Netlify.

### Step 5: Test Your VPS API

```bash
# Test health check
curl http://your-vps-ip:3000/health

# Test chat endpoint (replace with your API key)
curl -X POST http://your-vps-ip:3000/api/chat \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?", "model": "gemma3"}'
```

### Step 6: Update Netlify Environment Variables

1. Go to your Netlify dashboard
2. Navigate to Site settings → Environment variables
3. Add these variables:

```
VPS_API_URL = http://your-vps-ip:3000
VPS_API_KEY = your-generated-api-key
```

### Step 7: Deploy to Netlify

```bash
# From your ai-chatbot directory
git add .
git commit -m "Updated for VPS deployment"
git push origin main
```

### Step 8: Test Your Chatbot

Visit your Netlify site and test the chatbot. It should now use your VPS API!

## 🔧 Management Commands

```bash
# SSH into your VPS
ssh ubuntu@your-vps-ip

# Check all services
sudo /opt/lino-ai/manage.sh status

# Restart all services
sudo /opt/lino-ai/manage.sh restart

# View API logs
sudo /opt/lino-ai/manage.sh logs

# Health check
sudo /opt/lino-ai/manage.sh health
```

## 🌐 Domain Setup (Optional)

### 1. Point Domain to VPS
- Go to your domain registrar
- Add A record pointing to your VPS IP
- Wait for DNS propagation (up to 24 hours)

### 2. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Update Netlify Variables
```
VPS_API_URL = https://your-domain.com
```

## 📊 Monitoring

### Check Service Status
```bash
sudo systemctl status lino-ai-api
sudo systemctl status ollama
sudo systemctl status nginx
```

### View Logs
```bash
# API logs
sudo journalctl -u lino-ai-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Check
```bash
curl http://your-vps-ip:3000/health
```

## 🐛 Troubleshooting

### API Not Responding
```bash
# Check if service is running
sudo systemctl status lino-ai-api

# Restart service
sudo systemctl restart lino-ai-api

# Check logs
sudo journalctl -u lino-ai-api -f
```

### Ollama Issues
```bash
# Check Ollama status
sudo systemctl status ollama

# Start Ollama
sudo systemctl start ollama

# Check available models
ollama list

# Pull model if missing
ollama pull gemma3
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Firewall Issues
```bash
# Check firewall status
sudo ufw status

# Allow ports if needed
sudo ufw allow 3000
sudo ufw allow 80
sudo ufw allow 443
```

## 🔄 Updates

### Update API Server
```bash
cd /opt/lino-ai
git pull origin main
npm install
sudo systemctl restart lino-ai-api
```

### Update Ollama Models
```bash
ollama pull gemma3
```

## 💰 Cost Optimization

- **Oracle Cloud Free Tier**: Always free
- **Domain**: ~$10-15/year
- **SSL**: Free with Let's Encrypt
- **Total**: ~$10-15/year

## 🎉 Success!

Your Lino.AI chatbot is now running on your own VPS with:
- ✅ Full control over the AI model
- ✅ No API rate limits
- ✅ No usage costs
- ✅ Customizable responses
- ✅ Secure API key authentication

---

**Built by Ireri Linus Mugendi for Lino.AI** 🤖 