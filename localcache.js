'use strict';
/**
 * cacheStore.js
 * @author lingtong
 * 2017-09-20
 * 本地缓存系统（UMD规范）
 * 说明文档：https://zhuanlan.zhihu.com/p/29517983
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS之类的
        module.exports = factory(root);
    } else {
        // 浏览器全局变量(root 即 window)
        root.returnExports = factory(root);
    }
}(this, function () {
    function cacheStore (config) {
        if (!window.localStorage) {
            this.__log('Your agent does not support localStorage!');
            return {
                init: function () {this.__log('Init failed!');},
                save: function () {this.__log('Init failed!');},
                del: function () {this.__log('Init failed!');},
                get: function () {this.__log('Init failed!');},
                update: function () {this.__log('Init failed!');},
                flush: function () {this.__log('Init failed!');},
                getSize: function () {this.__log('Init failed!');}
            };
        }
        this.DATATYPE = 'JSON';
        this.EXPIRE = 1;
        this.ISCLEANDIRTYSTORAGE = false;
        this.ISCLEANDATAWHENFULL = true;
        this.TURNONLOGGER = false;
        this.init(config);
    };
    /**
     * [init 初始化cacheStore对象，可配置get()返回数据的类型，过期时间设置方式等]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:28:10
     * @param          {[type]}                 config [系统配置参数]
     * @return         {[type]}                        [description]
     */
    cacheStore.prototype.init = function (config) {
        var that = this;
        config = typeof config !== 'object' ? {} : config;
        // 配置返回值类型，String, JSON，默认是'JSON'
        that.DATATYPE = config.dataType ? config.dataType : 'JSON';
        // 配置过期时间的设置方式，默认是1
        // 1，按照【时间间隔】设置过期
        // 如：时间间隔是1天，则本次请求以后的1天内，不过期，从localStrorage中读取数据；
        // 反之，本次请求以后的1天后，过期，重新从接口请求数据并设置过期时间为1天后；
        // 2，按照【时间点】设置过期
        // 如：时间点是2016-07-20 00:00:00，则此时间点内，不过期，从localStrorage中读取数据；
        // 反之，此时间点后，过期，重新从接口请求数据；
        // 3，按照【时间点】【时间间隔】设置过期，===作废===
        // 此构想逻辑与系统逻辑相违背：对于过期数据的处理等操作应该交给开发者而非系统本身，
        // 自动按照【时间间隔】【时间点】设置数据，即间接跳过了用户定义的操作
        that.EXPIRE = config.expire ? config.expire : 1;
        // 当存在脏数据时，是否删除脏数据
        // 传入一个以毫秒(ms)为单位的数值，当前时间与过期时间相减的差值超过这个数值的数据即是脏数据，会被清除
        // 如：1 * 24 * 60 * 60 * 1000，即是一天前的数据都是脏数据，会被清除
        // 默认值是false，此时，不清除脏数据
        that.ISCLEANDIRTYSTORAGE =
            config.isCleanDirtyStorage !== false && config.isCleanDirtyStorage !== undefined
            ? config.isCleanDirtyStorage
            : 'false';
        if (!isNaN(that.ISCLEANDIRTYSTORAGE)) {
            that._flushDirtyRead(that.ISCLEANDIRTYSTORAGE); // 清除脏数据
        }
        // 当localStorage满时，是否删除过期数据
        // 传入一个布尔值，false即不删除过期数据，true则删除过期数据以完成插入操作
        // 如：false，控制台输出提示localStorage已经满了；true，删除过期数据以完成插入操作
        // 默认值是true，此时，当localStorage满时，清除所有过期数据
        that.ISCLEANDATAWHENFULL =
            config.isCleanDataWhenFull === false
            ? config.isCleanDataWhenFull
            : true;
        // 开关控制台输出
        // 如：true，开启控制台输出；false，关闭控制台输出
        // 默认值是false，此时，关闭控制台输出
        that.TURNONLOGGER = config.turnOnLogger ? config.turnOnLogger : false;
    };
    /**
     * [save 以键名为索引插入键值(同名覆盖)]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:28:58
     * @param          {[type]}                 param    [传入item参数]
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.save = function (param, callback) {
        var that = this;
        if (!that.__typeof(param)) return;
        if (!that.__checkKeyName(param.keyName)) return;
        that.__add(param, callback);
    };
    /**
     * [del 以键名为索引删除键值]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:29:57
     * @param          {[type]}                 param    [传入item参数]
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.del = function (param, callback) {
        var that = this;
        if (!that.__typeof(param)) return;
        if (!that.__checkKeyName(param.keyName)) return;
        var keyName = param.keyName;
        localStorage.removeItem(keyName);
        var returnValues = {
            data: param,
            result: 1,
            msg: 'Delete ' + param.keyName + ' successfully!'
        };
        callback && typeof callback === 'function' && callback(returnValues);
        return returnValues;
    };
    /**
     * [get 以键名为索引获取键值]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:30:49
     * @param          {[type]}                 param    [传入item参数]
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.get = function (param, callback) {
        var that = this;
        if (!that.__typeof(param)) return;
        if (!that.__checkKeyName(param.keyName)) return;
        var keyName = param.keyName;
        var item = localStorage.getItem(keyName);
        var value = '';
        var expireDate = '';
        var period = '';
        var data = null;
        var returnValues = null;
        if (item) {
            if (that.DATATYPE === 'JSON') {
                try {
                    item = JSON.parse(localStorage.getItem(keyName));
                    if (item.value) {
                        try {
                            value = JSON.parse(item.value);
                        }
                        catch (err) {
                            value = item.value;
                        }
                    }
                    else {
                        value = '';
                    }
                    expireDate = item.expireDate ? item.expireDate : '';
                    period = item.period ? item.period : '';
                    data = {
                        value: value,
                        expireDate: expireDate,
                        period: period
                    };
                }
                catch (err) {
                    data = item;
                }
                returnValues = {
                    data: data,
                    result: 1,
                    msg: 'Find ' + keyName + ' as JSON successfully!'
                };
            }
            else if (that.DATATYPE === 'String') {
                returnValues = {
                    data: item,
                    result: 2,
                    msg: 'Find ' + keyName + ' as String successfully!'
                };
            }
        }
        else {
            returnValues = {
                data: item,
                result: 0,
                msg: 'Can not found ' + keyName
            };
        }
        callback && typeof callback === 'function' && callback(returnValues);
        return returnValues;
    };
    /**
     * [update 以键名为索引更新键值]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:31:14
     * @param          {[type]}                 param    [传入item参数]
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.update = function (param, callback) {
        var that = this;
        if (!that.__typeof(param)) return;
        if (!that.__checkKeyName(param.keyName)) return;
        that.__add(param, callback);
    };
    /**
     * [flush 清空缓存(localStorage) | 从无差别清空转换成清空系统添加的缓存数据]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:31:41
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.flush = function (callback) {
        var that = this;
        for (var i in localStorage) {
            var item = null;
            try {
                item = JSON.parse(localStorage[i]);
            }
            catch (err) {
                that.__log(i + ': ' +err);
            }
            if (item && item.expireDate) {
                that.del({keyName: i});
            }
        }
        callback && typeof callback === 'function' && callback();
    };
    /**
     * [getSize 获取一个或多个键值的长度大小]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:32:20
     * @param          {[type]}                 param    [传入item参数]
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.getSize = function (param, callback) {
        var size = 0;
        // 指明键值名(param.keyName)，返回该键值对应的长度
        if (param && param.keyName && typeof param === 'object') {
            size = JSON.stringify(localStorage.getItem(param.keyName)).length;
        }
        // 没有指明键值名(param.keyName)，返回本域下所有键值的长度总和
        else {
            // 有误差，item键值的长度没有计算进去
            // JSON.stringify(localStorage).length，这样直接计算能够得到准确的长度，但是ie不支持这种写法
            for (var i in localStorage) {
                size += JSON.stringify(localStorage[i]).length;
            }
        }
        callback && typeof callback === 'function' && callback(size);
        return size;
    };
    /**
     * [getRemainSize 获取当前域下localStorage的剩余容量大小，以字节(b)为单位]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:32:44
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.getRemainSize = function (callback) {
        var that = this;
        var currentSize = that.getSize();
        var totalSize = that.__checkUserAgent();
        // 此处是一个大约的数值，会有100000b到200000b的误差
        var remainingSize = totalSize - currentSize;
        callback && typeof callback === 'function' && callback(remainingSize);
        return remainingSize;
    };
    /**
     * [_flushDirtyRead 脏数据检查并处理，处理原则：过期则删除
     * @Authorlingtong
     * @DateTime       2016-08-16 18:33:07
     * @param          {[type]}                 date     [毫秒数，0或正整数]
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype._flushDirtyRead = function (date, callback) {
        var that = this;
        var flushSize = 0;
        var dValue = isNaN(date) ? 0 : date;
        for (var i in localStorage) {
            var item = null;
            try {
                item = JSON.parse(localStorage[i]);
            }
            catch (err) {
                that.__log(i + ': ' +err);
            }
            if (item && item.expireDate) {
                var currentDate = new Date().getTime();
                var expireDate = item.expireDate;
                if (!that.__checkDateTimeFormat(expireDate)) {
                    return;
                }
                if (currentDate - new Date(expireDate).getTime() > dValue) {
                    that.getSize({keyName: i}, function (size) {
                        flushSize += size;
                    });
                    that.del({keyName: i}, function () {
                        that.__log(i + ' is passed expire(' + expireDate + ') and has been deleted!');
                    });
                }
            }
            else {
                that.__log(i + ': ' + 'this item has no expireDate attribute!');
            }    
        }
        callback && typeof callback === 'function' && callback(flushSize);
    };
    /**
     * [__add 在缓存中插入一条数据，同名覆盖]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:34:04
     * @param          {[type]}                 param    [传入item参数]
     * @param          {Function}               callback [回调函数]
     * @return         {[type]}                          [description]
     */
    cacheStore.prototype.__add = function (param, callback) {
        var that = this;
        var keyName = param.keyName;
        var value = param.value;
        var period = param.period && !isNaN(param.period) ? param.period : 0; // 默认为周期过期，周期为0 ms
        var expireDate = param.expireDate;
        var currentDate = new Date().getTime(); // ms
        switch (that.EXPIRE) {
            // 模式1，按照【时间间隔】设置过期
            case 1:
                period = param.period && !isNaN(param.period) ? param.period : 1 * 24 * 60 * 60 * 1000;
                expireDate = that.__formatDateTime(new Date(currentDate + period));
                break;
            // 模式2，按照【时间点】设置过期
            case 2:
                if (that.__checkDateTimeFormat(expireDate)) {
                    expireDate = param.expireDate;
                    // 过滤过去的时间（不允许设置过去的时间为过期时间），此时不写入localStorage
                    if (currentDate > new Date(expireDate).getTime()) {
                        that.__log('expireDate was less than currentDate. Nothing to be done!');
                        return;
                    }
                }
                else {
                    return;
                }
                break;
            // 默认：模式1，按照【时间间隔】设置过期
            default:
                period = param.period && !isNaN(param.period) ? param.period : 1 * 24 * 60 * 60 * 1000;
                currentDate = new Date().getTime(); // ms
                expireDate = that.__formatDateTime(new Date(currentDate + period));
                break;
        }
        var item = {
            value: JSON.stringify(param.value),
            period: period,
            expireDate: expireDate
        };
        try {
            localStorage.setItem(keyName, JSON.stringify(item));
        }
        catch (err) {
            if (that.ISCLEANDATAWHENFULL === true) {
                that._flushDirtyRead(0, function (flushSize) {
                    if (flushSize > JSON.stringify(item).length) {
                        try {
                            localStorage.setItem(keyName, JSON.stringify(item));
                        }
                        catch (err) {
                            that.__log(err + ', ' + 'cacheStore has flushed the dirty data in localStorage, but it is not big enough for your item!');
                        }
                    }
                    else {
                        that.__log(err + ', ' + 'cacheStore has flushed the dirty data in localStorage, but it is not big enough for your item!');
                    }
                });
            }
            else {
                that.__log(err + ', ' + 'localStorage is full!');
            }
        }
        var data = {
            value: param.value,
            period: period,
            expireDate: expireDate
        };
        var returnValues = {
            data: data,
            result: 1,
            msg: 'Set item ' + keyName + ' successfully!'
        };
        callback && typeof callback === 'function' && callback(returnValues);
        return returnValues;
    };
    /**
     * [__typeof 类型检查，检查是否为object]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:34:42
     * @param          {[type]}                 param [传入item参数]
     * @return         {[type]}                       [回调函数]
     */
    cacheStore.prototype.__typeof = function (param) {
        var that = this;
        if(!(param && typeof param === 'object')) {
            that.__log('The type of PARAM is not correct! Nothing to be done!');
            return false;  
        }
        else {
            return true;
        }
    };
    /**
     * [__formatDateTime 格式化日期为YYYY-MM-DD HH:MM:SS]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:35:04
     * @param          {[type]}                 expire [毫秒数，0或正整数]
     * @return         {[type]}                        [description]
     */
    cacheStore.prototype.__formatDateTime = function (expire) {
        var __getDoubleDigit = function (num) {
            return num < 10 ? '0' + num : num;
        };
        var year = expire.getFullYear();
        var month = __getDoubleDigit(expire.getMonth() + 1);
        var day = __getDoubleDigit(expire.getDate());
        var hour = __getDoubleDigit(expire.getHours());
        var min = __getDoubleDigit(expire.getMinutes());
        var second = __getDoubleDigit(expire.getSeconds());
        return [[year, month, day].join('/'), [hour, min, second].join(':')].join(' ');
    };
    /**
     * [__checkDateTimeFormat 检查日期是否为YYYY-MM-DD HH:MM:SS]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:35:40
     * @param          {[type]}                 expireDate [传入字符串]
     * @return         {[type]}                            [description]
     */
    cacheStore.prototype.__checkDateTimeFormat = function (expireDate) {
        var that = this;
        var __dateTimeReg = /^(?:19|20)[0-9][0-9]\/(?:(?:0[1-9])|(?:1[0-2]))\/(?:(?:[0-2][1-9])|(?:[1-3][0-1])) (?:(?:[0-2][0-3])|(?:[0-1][0-9])):[0-5][0-9]:[0-5][0-9]$/;
        if (!__dateTimeReg.test(expireDate)) {
            that.__log('DateTime`s format is not correct!');
            return false;
        }
        return true;
    };
    /**
     * [__checkKeyName 检查键名是否已定义]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:36:29
     * @param          {[type]}                 keyName [传入键名]
     * @return         {[type]}                         [description]
     */
    cacheStore.prototype.__checkKeyName = function (keyName) {
        var that = this;
        if (keyName === undefined || '') {
            that.__log('KEYNAME is undefined. Nothing to be done!');
            return false;
        }
        else {
            return true;
        }
    };
    /**
     * [__checkUserAgent 检查浏览器类型返回对应的localStorage容量]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:36:56
     * @return         {[type]}                 [description]
     */
    cacheStore.prototype.__checkUserAgent = function () {
        var userAgent = navigator.userAgent;
        var isOpera = userAgent.indexOf('Opera') > -1;
        var isFirefox = userAgent.indexOf('Firefox') > -1;
        var isChrome = userAgent.indexOf('Chrome') > -1;
        var isSafari = userAgent.indexOf('Safari') > -1;
        var isCompatible = userAgent.indexOf('compatible') > -1;
        var isMsie = userAgent.indexOf('MSIE') > -1;
        if (isOpera) {
            // 实际测出来是5200000，但为了兼容误差，估算为500000
            return 5000000;
        }
        if (isFirefox) {
            // 实际测出来是5200000，但为了兼容误差，估算为500000
            return 5000000;
        }
        if (isChrome){
            // 实际测出来是5200000，但为了兼容误差，估算为500000
            return 5000000;
        }
        if (isSafari) {
            // 实际测出来是2600000，但为了兼容误差，估算为2400000
            return 2600000;
        }
        if (isCompatible && isMsie && !isOpera) {
            // 实际测出来是4900000，但为了兼容误差，估算为570000
            return 4700000;
        }
    };
    /**
     * [__log 控制台输出功能封装（可通过turnOnLogger参数开关log功能）]
     * @Authorlingtong
     * @DateTime       2016-08-16 18:37:17
     * @param          {[type]}                 a [传入信息1]
     * @param          {[type]}                 b [传入信息2]
     * @param          {[type]}                 c [传入信息3]
     * @param          {[type]}                 d [传入信息4]
     * @param          {[type]}                 e [传入信息5]
     * @return         {[type]}                   [description]
     */
    cacheStore.prototype.__log = function(a, b, c, d, e) {
        var that = this;
        if (that.TURNONLOGGER) {
            if (typeof console !== 'undefined' && console.log) {
                try {
                    console.log.apply(console, Array.prototype.slice.call(arguments));
                }
                catch (e) {
                    switch (arguments.length) {
                        case 0:
                            console.log();
                            break;
                        case 1:
                            console.log(a);
                            break;
                        case 2:
                            console.log(a, b);
                            break;
                        case 3:
                            console.log(a, b, c);
                            break;
                        case 4:
                            console.log(a, b, c, d);
                            break;
                        case 5:
                            console.log(a, b, c, d, e);
                            break;
                    }
                }
            }
        }
    };
    return cacheStore;
}));
