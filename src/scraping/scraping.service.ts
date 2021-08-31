import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ScrapingService extends PrismaClient {
  private readonly logger = new Logger(ScrapingService.name);

  getHello(): string {
    return 'web crawling and scraping!';
  }

  @Cron('0 33 * * * *') // 27분 45초, 28분 45초...
  handleCron() {
    this.logger.debug('Called when the current second is 45');

    this.getMenuList();
  }

  async getMenuList() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://www.starbucks.co.kr/menu/drink_list.do');
    await page.waitForSelector(
      // 모든 음료 리스트
      '#container > div.content > div.product_result_wrap.product_result_wrap01 > div.product_view_tab_wrap > dl > dd:nth-child(2) > div.product_list > dl > dd > ul > li',
    );
    const body = await page.content();
    await page.close();
    await browser.close();

    const $ = cheerio.load(body);
    const list = $(
      '#container > div.content > div.product_result_wrap.product_result_wrap01 > div.product_view_tab_wrap > dl > dd:nth-child(2) > div.product_list > dl > dd > ul > li',
    );

    const product_cd_list = [];
    list.each(function (idx, ele) {
      const obj = {
        product_cd: $(this).find('a').attr('prod'),
        img_url: $(this).find('img').attr('src'),
      };
      product_cd_list.push(obj); // product_cd만 추출해서 배열에 삽입
    });

    // console.log(product_cd_list);
    this.getProductDetail(product_cd_list);
  }

  async getProductDetail(product_cd_list) {
    const product_info_list = [];

    for (let i = 0; i < product_cd_list.length; i++) {
      const target_url =
        'https://www.starbucks.co.kr/menu/productViewAjax.do?product_cd=' +
        product_cd_list[i].product_cd;
      await axios({
        method: 'GET',
        url: target_url,
      }).then((res) => {
        res.data.view.img_url = product_cd_list[i].img_url;
        res.data.view.menu_orig_cd = product_cd_list[i].product_cd;
        res.data.view.brand_idx = 1;
        product_info_list.push(res.data.view);
      });
    }

    this.insertProductList(product_info_list);
  }

  insertProductList(product_info_list) {
    product_info_list.forEach(async (product_info) => {
      try {
        await this.menu.upsert({
          where: { menu_orig_cd: product_info.menu_orig_cd },
          update: {
            menu_nm_ko: product_info.product_NM,
            menu_nm_en: product_info.product_ENGNM,
            menu_desc: product_info.content,
            menu_img_url: product_info.img_url,
            menu_has_caffeine: product_info.caffeine != '0' ? true : false,
          },
          create: {
            brand_idx: product_info.brand_idx,
            menu_orig_cd: product_info.menu_orig_cd,
            menu_nm_ko: product_info.product_NM,
            menu_nm_en: product_info.product_ENGNM,
            menu_desc: product_info.content,
            menu_img_url: product_info.img_url,
            menu_allergy: product_info.allergy,
            menu_has_caffeine: product_info.caffeine != '0' ? true : false,
          },
        });

        this.logger.debug('finished');
      } catch (e) {
        console.log(e);
      }
    });
  }
}
