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

//var request = require('request');


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
        pic: 'http://marketing.by/upload/medialibrary/577/doublecklock-logo.png',
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
  
  webot.set('query', {
    description: '查询',
    pattern: /^ *query ca-pub-.* 201\d-\d\d-\d\d *$/i,
    handler: function(info){
      ad_client_id = info.text.split(' ')[1].replace(' ', '');
      end_date_str = info.text.split(' ')[2].replace(' ', '');

      google.options({ auth: oauth2Client });
      var auth_url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/adexchange.seller.readonly'
      });
      //info.wait('verify');
      var reply = {
        title: '请先授权我帮您查询7日内您的Adx账号数据',
        pic: 'http://marketing.by/upload/medialibrary/577/doublecklock-logo.png',
        url: auth_url,
        description: [
          '请在获取验证码后按照\'verify [验证码]\'的格式将验证码发送给我'
        ].join('\n')
      };
      return reply;
    }
  });

  function generate_report(code, cb){
    console.log(code);
    oauth2Client.getToken(code, function (err, tokens) {
      if (err) {
        throw err;
      }
      oauth2Client.setCredentials(tokens);
      var adxseller = google.adexchangeseller('v2.0');

      account_id = ad_client_id.replace('ca-pub-', 'pub-');
      var end_date = new Date(end_date_str);
      var start_date = end_date;
      start_date.setDate(start_date.getDate() - 7);
      var start_date_str = start_date.toISOString().slice(0,10);
      report_json = adxseller.accounts.reports.generate({
        auth: oauth2Client,
        accountId: account_id,
        startDate: start_date_str,
        endDate: end_date_str,
        dimension: 'DATE',
        metric: ['AD_REQUESTS', 'AD_REQUESTS_COVERAGE',
          'COST_PER_CLICK', 'AD_REQUESTS_RPM', 'EARNINGS'],
      }, function (err, result) {
        if (err) throw err;

        var reply = '';
        for (let header of result.headers) reply = reply + header.name + '  '
        if (result.rows) {
          for (let row of result.rows) {
            reply = reply + '\n'
            for (let col of row) say = say + col + '  ';

          }
        }
        return cb(null, reply);
      });
    });
  };

  function do_reporting(info, next){
    var q = info.text.split(' ')[1].replace(' ', '');

    return generate_report(q , next);
  }


  webot.set('report', {
    description: 'generate report ',
    pattern: /^ *verify /i,
    //handler也可以是异步的
    handler: do_reporting
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
