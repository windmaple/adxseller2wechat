var crypto = require('crypto');

var debug = require('debug');
var log = debug('webot-example:log');
var verbose = debug('webot-example:verbose');
var error = debug('webot-example:error');

var package_info = require('../package.json');

var google_client_id = process.env.GCLIENTID;
var google_client_secret = process.env.GCLIENTSECRET;

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(google_client_id, google_client_secret, 'urn:ietf:wg:oauth:2.0:oob');
var ad_client_id = '';
var end_date_str = '';
var query_result = '';


module.exports = exports = function(webot){
  var reg_help = /^(help|\?|帮助)$/i
  webot.set({
    name: 'hello help',
    description: '获取使用帮助，发送 help',
    pattern: function(info) {
      return info.is('event') && info.param.event === 'subscribe' || reg_help.test(info.text);
    },
    handler: function(info){
      var reply = {
        title: '感谢您使用adxseller2wechat机器人',
        pic: 'https://en.wikipedia.org/wiki/Google_logo#/media/File:Google_2015_logo.svg',
        url: 'https://www.google.com/adxseller',
        description: [
          '请按如下格式输入信息来查询7日AdX数据:',
          '查询   发布商ID(ca-pub-XXXXXXX)   截止日期(YYYY-MM-DD)',
          '',
          '示例:',
          '查询   ca-pub-999999999999   2016-05-10'
        ].join('\n')
      };
      return reply;
    }
  });


  webot.set(/^verify: /i, function(info){
    code = info.text.replace('verify: ', '');
    oauth2Client.getToken(code, function (err, tokens) {
      if (err) {
        throw err;
      }

      oauth2Client.setCredentials(tokens);
      let adxseller = google.adexchangeseller('v2.0');

      account_id = ad_client_id.replace('ca-pub-', 'pub-');
      let end_date = new Date(end_date_str);
      let start_date = end_date;
      start_date.setDate(start_date.getDate() - 7);
      let start_date_str = start_date.toISOString().slice(0,10);
      report_json = adxseller.accounts.reports.generate({
        auth: oauth2Client,
        accountId: account_id,
        startDate: start_date_str,
        endDate: end_date_str,
        dimension: 'DATE',
        metric: ['AD_REQUESTS', 'AD_REQUESTS_COVERAGE',
        'COST_PER_CLICK', 'AD_REQUESTS_RPM', 'EARNINGS'],
      }, (err, result) => {
        if (err) throw err;
        var reply = '';
        for (let header of result.headers) reply = reply + header.name + '  ';
        for (let row of result.rows)
        {
          reply = reply + '\n';
          for (let col of row)
          reply = reply + col + '  ';
        }
        query_result = reply;
      });
      return 'query_result';
    });
  });


  webot.set('query', {
    description: '查询',
    pattern: /^ *查询 ca-pub-.* 201\d-\d\d-\d\d *$/i,
    handler: function(info){
      ad_client_id = info.text.split(' ')[1].replace(' ', '');
      end_date_str = info.text.split(' ')[2].replace(' ', '');

      google = require('googleapis');
      OAuth2 = google.auth.OAuth2;
      oauth2Client = new OAuth2(google_client_id,
				    google_client_secret,
                        		'urn:ietf:wg:oauth:2.0:oob');

      google.options({ auth: oauth2Client });
      var auth_url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/adexchange.seller.readonly'
      });
      info.wait('verify');
      var reply = {
        title: '请先授权我帮您查询7日内您的Adx账号数据',
        pic: 'http://marketing.by/upload/medialibrary/577/doublecklock-logo.png',
        url: auth_url,
        description: [
          '请在获取验证码后按照\'verify: [验证码]\'的格式将验证码发送给我'
        ].join('\n')
      };
      return reply;
    }
  });


  webot.set(/.*/, function(info){
    log('unhandled message: %s', info.text);
    info.flag = true;
    return '你发送了「' + info.text + '」,可惜我太笨了,听不懂. 发送: help 查看可用的指令';
  });
};
