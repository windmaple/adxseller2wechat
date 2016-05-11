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
    // name 和 description 都不是必须的
    name: 'hello help',
    description: '获取使用帮助，发送 help',
    pattern: function(info) {
      //首次关注时,会收到subscribe event
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
      // 返回值如果是list，则回复图文消息列表
      return reply;
    }
  });

  webot.waitRule('verify', function(info) {
    var rewaitCount = info.session.rewait_count || 0;
    if (rewaitCount >= 2) {
      info.resolve();
      return '请重新申请一个验证码!';
    }

    if (info.text.indexOf('verify: ') != 0) {
      info.rewait();
      return '错误的格式。请使用\'verify: [验证码]\'的格式将验证码发送给我';
    }
    else {
      code = info.text.replace('verify: ', '');
      console.log(code);
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
    }
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
/*
      info.session.oauth2Client = oauth2Client;
      info.session.google = google;
*/

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

  //所有消息都无法匹配时的fallback
  webot.set(/.*/, function(info){
    // 利用 error log 收集听不懂的消息，以利于接下来完善规则
    // 你也可以将这些 message 存入数据库
    log('unhandled message: %s', info.text);
    info.flag = true;
    return '你发送了「' + info.text + '」,可惜我太笨了,听不懂. 发送: help 查看可用的指令';
  });
};
