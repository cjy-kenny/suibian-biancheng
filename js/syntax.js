"use strict";
/* 语法速查卡：t=标题，rows=[代码, 说明] */
const SYNTAX = {
  py: [
    {
      t: '变量与类型',
      rows: [
        ['x = 5', '整数 int'],
        ['pi = 3.14', '浮点数 float'],
        ['name = "小明"', '字符串 str'],
        ['ok = True', '布尔值 True / False'],
        ['type(x)', '查看类型'],
        ['int("42")  str(3.14)', '类型转换'],
      ],
    },
    {
      t: '输入与输出',
      rows: [
        ['print("Hi", x)', '打印，逗号隔开各项'],
        ['print(a, end="")', '不换行输出'],
        ['s = input("提示：")', '读一行输入（是字符串）'],
        ['n = int(input())', '读整数'],
        ['f"值是{x}"', 'f-string 格式化'],
        ['f"{a / b:.2f}"', '保留两位小数'],
      ],
    },
    {
      t: '分支 if / elif / else',
      rows: [
        ['if x > 0:', '注意冒号和缩进'],
        ['elif x == 0:', '等同 else if'],
        ['else:', '其余情况'],
        ['and / or / not', '逻辑运算'],
        ['x in [1, 2, 3]', '成员判断'],
      ],
    },
    {
      t: '循环 for / while',
      rows: [
        ['for i in range(5):', 'i = 0,1,2,3,4'],
        ['for i in range(1, 10, 2):', '从1到9，步长2'],
        ['for ch in "abc":', '遍历字符串'],
        ['while 条件:', '条件成立就一直跑'],
        ['break / continue', '跳出 / 跳过本次'],
      ],
    },
    {
      t: '列表与字典',
      rows: [
        ['lst = [1, 2, 3]', '列表'],
        ['lst.append(4)  len(lst)', '追加 / 长度'],
        ['lst[0]  lst[-1]', '取元素（-1 是最后一个）'],
        ['sum(lst)  max(lst)  min(lst)', '快速统计'],
        ['d = {"a": 1}', '字典'],
        ['d["a"]  d.get("b", 0)', '取值 / 带默认值'],
      ],
    },
    {
      t: '函数 def',
      rows: [
        ['def add(a, b):', '定义函数'],
        ['    return a + b', '返回结果'],
        ['add(1, 2)', '调用'],
        ['def f(x, times=1):', '默认参数'],
        ['return a, b', '可同时返回多个值'],
      ],
    },
  ],
  cpp: [
    {
      t: '程序骨架',
      rows: [
        ['#include <iostream>', '引入输入输出库'],
        ['using namespace std;', '使用标准命名空间'],
        ['int main() { ... }', '程序入口'],
        ['return 0;', '正常结束（退出码 0）'],
        ['// 注释', '单行注释'],
      ],
    },
    {
      t: '变量与类型',
      rows: [
        ['int x = 5;', '整数'],
        ['long long big = 1e18;', '大整数'],
        ['double pi = 3.14;', '小数'],
        ['char c = \'A\';', '单个字符'],
        ['bool ok = true;', '布尔值'],
        ['const int N = 10;', '常量（不可改）'],
      ],
    },
    {
      t: '输入与输出',
      rows: [
        ['cout << a << endl;', '输出 + 换行'],
        ['cout << a << " " << b;', '拼着输出'],
        ['cin >> a >> b;', '读入（自动跳过空格）'],
        ['"\\n" 与 endl', '换行的两种写法'],
      ],
    },
    {
      t: '分支与循环',
      rows: [
        ['if (x > 0) { } else if { } else { }', '分支'],
        ['for (int i = 0; i < n; i++) { }', '计次循环'],
        ['while (条件) { }', '条件循环'],
        ['do { } while (条件);', '至少执行一次'],
        ['break / continue', '跳出 / 跳过'],
      ],
    },
    {
      t: '数组',
      rows: [
        ['int a[10];', '10 个 int，下标 0~9'],
        ['int a[5] = {1, 2, 3, 4, 5};', '声明时初始化'],
        ['a[0] = 99;', '按下标读写'],
        ['for (int i = 0; i < 5; i++) a[i];', '遍历'],
      ],
    },
    {
      t: '函数',
      rows: [
        ['int add(int a, int b) {', '定义：返回值类型 + 参数'],
        ['    return a + b;', '返回结果'],
        ['}', ''],
        ['add(1, 2)', '调用'],
        ['void say(string s)', 'void = 不返回值'],
      ],
    },
  ],
};
