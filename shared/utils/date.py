# -*- coding: utf-8 -*-
# @Time : 2025/10/4 19:24
# @Author : chenxiangan
# @File : date.py
# @Software: PyCharm
# coding: utf-8

import datetime
import re
import time

import dateparser
from dateutil.parser import parse

default_format = "%Y-%m-%d %H:%M:%S"


class Date:

    @staticmethod
    def _time_to_format_timestamp(publish_time, time_format=default_format):
        return int(time.mktime(datetime.datetime.strptime(str(publish_time), time_format).timetuple()))

    @staticmethod
    def format_time(publish_time):
        rule_format = r"(\d+)"
        if ("小时前" or "小时以前") in publish_time:
            hour = int(re.search(rule_format, publish_time).group(1))
            publish_time = (datetime.datetime.now() - datetime.timedelta(hours=hour)).strftime(default_format)
        elif ("分钟前" or "分钟以前") in publish_time:
            minute = int(re.search(rule_format, publish_time).group(1))
            publish_time = (datetime.datetime.now() - datetime.timedelta(minutes=minute)).strftime(default_format)
        elif "秒前" in publish_time:
            second = int(re.search(rule_format, publish_time).group(1))
            publish_time = (datetime.datetime.now() - datetime.timedelta(seconds=second)).strftime(default_format)
        return publish_time

    @staticmethod
    def format_date(publish_time):
        if "昨天" in publish_time:
            # 36kr只写了昨天没有后面时间，特殊处理
            _yesterday = re.search(r"(\d\d:\d\d)", publish_time)
            if _yesterday:
                hour_minute = _yesterday.group(1)
            else:
                hour_minute = "00:00"
            publish_time = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime(
                "%Y-%m-%d") + " " + hour_minute + ":00"
        elif "前天" in publish_time:
            before_yesterday = re.search(r"(\d\d:\d\d)", publish_time)
            if before_yesterday:
                hour_minute = before_yesterday.group(1)
            else:
                hour_minute = "00:00"
            publish_time = (datetime.datetime.now() - datetime.timedelta(days=2)).strftime(
                "%Y-%m-%d") + " " + hour_minute + ":00"
        elif ("天前" or "天以前") in publish_time:
            _day = re.findall(r"\d+", publish_time)[0]
            publish_time = (datetime.datetime.now() - datetime.timedelta(days=int(_day))).strftime(default_format)
        elif "月前" in publish_time:
            _day = re.findall(r"\d+", publish_time)[0]
            publish_time = (datetime.datetime.now() - datetime.timedelta(days=int(_day) * 30)).strftime(
                default_format)
        elif "刚刚" in publish_time:
            publish_time = datetime.datetime.now().strftime(default_format)
        elif len(publish_time.split("-")) == 2:
            publish_time = datetime.datetime.now().strftime("%Y") + "-" + publish_time + " 00:00:00"
        return publish_time

    def time_to_timestamp(self, publish_time, time_format=default_format):
        """
        指定/非指定的时间格式 转时间戳

        time_format: 指定的时间格式，不传的话就会自动猜测时间格式
        bad case:2022年10月05日
        """
        if not publish_time:
            return None  # 这里需要考虑默认值是 None '' int(time.time()) 哪种比较合理
        if isinstance(publish_time, int):
            return int(str(publish_time)[:10])  # 秒级时间戳
        publish_time = self.format_time(publish_time)
        publish_time = self.format_date(publish_time)
        if default_format != time_format:  # 自定义格式
            return self._time_to_format_timestamp(publish_time, time_format)
        else:
            return int(time.mktime(parse(publish_time).timetuple()))

    @staticmethod
    def fmt_publish_time(publish_time):
        if isinstance(publish_time, int):
            return int(str(publish_time)[:10])
        publish_time = publish_time.replace("時", "时").replace("鐘", "钟")
        publish_time_obj = dateparser.parse(publish_time.strip())
        if publish_time_obj:
            return int(publish_time_obj.strftime('%s'))
        if "刚刚" in publish_time:
            publish_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return publish_time

    def time_to_time(self, publish_time, source_format=default_format, target_format=default_format):
        """指定非指定的时间格式转换成指定的时间格式"""
        ts = self.time_to_timestamp(publish_time, source_format)
        return self.timestamp_to_time(ts, target_format)

    @staticmethod
    def timestamp_to_time(publish_time, time_format=default_format):
        """
        时间戳转换成指定时间
        """
        publish_time = int(publish_time)
        if not isinstance(publish_time, int):
            return publish_time
        if len(str(publish_time)) == 13:  # 毫秒
            publish_time //= 1000
        return time.strftime(time_format, time.localtime(publish_time))

    @staticmethod
    def time_to_special_time(publish_time, time_format=default_format, rule="decr", days=0, hours=0,
                             minutes=0, seconds=0):
        """
        指定时间转指定日期之前/后的时间

        publish_time: 需要处理的时间
        rule: incr: 把时间往后推 N 长时间， 比如 N 天后 decr:  把时间往前推 N 长时间， 比如 N 天前
        day: 日
        hour: 小时
        minute: 分
        second: 秒
        """
        date = datetime.datetime.strptime(publish_time, time_format)
        if rule == "incr":
            return (date + datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)).strftime(
                time_format)
        if rule == "decr":
            return (date - datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)).strftime(
                time_format)
        return None

    @staticmethod
    def time_to_special_timestamp(publish_time, time_format=default_format, rule="decr", days=0, hours=0,
                                  minutes=0, seconds=0):
        """
        指定时间转指定日期之前/后的时间戳

        publish_time: 需要处理的时间
        rule: incr: 把时间往后推 N 长时间， 比如 N 天后 decr:  把时间往前推 N 长时间， 比如 N 天前
        year: 年
        month: 月
        day: 日
        hour: 小时
        minute: 分
        second: 秒
        """
        date = datetime.datetime.strptime(publish_time, time_format)
        if rule == "incr":
            return int(time.mktime(
                (date + datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)).timetuple()))
        if rule == "decr":
            return int(time.mktime(
                (date - datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)).timetuple()))
        return None
