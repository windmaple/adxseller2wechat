# adxseller2wechat
A simple Wechat bot that pulls performance data from Google Adx Seller inside Wechat Subscription account. It uses standard Google OAuth/Adexchange Seller API and is heavily inspired by node-webot/webot.

# Instructions
1. Set up your Wechat subscription account. I used JoeShi/wechat-server-validation to do server verification to save a few minutes. Remember your token.
2. Set up your Google API access
3. standard Node stuff: npm install 
4. sudo WX_TOKEN=yourwechattoken GCLIENTID=yourgoogleclientid GCLIENTSECRET=yourgoogleclientsecret (Wechat only accepts 80/443 port, thus sudo...)

# Note
Webot-cli is very convenient for debugging


