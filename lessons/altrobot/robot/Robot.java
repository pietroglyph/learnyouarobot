package com.spartronics4915.learnyouarobot.alternate;

import edu.wpi.first.wpilibj.IterativeRobot;

import com.spartronics4915.learnyouarobot.Lesson;

public class Robot extends IterativeRobot {
	@Override
	public void autonomousInit() {
    Lesson l = new Lesson(3.0);
		l.start();
  }
}
