package com.spartronics4915.learnyouarobot;

import edu.wpi.first.wpilibj.command.Command;
import edu.wpi.first.wpilibj.Timer;

public class Lesson extends Command {
    private Timer mTimer;
    private double mDuration;

    public Lesson(double duration) {
        mDuration = duration;          // Save the duration of the delay
        mTimer = new Timer();          // Create the timer
    }

    @Override
    public void initialize() {
        mTimer.reset();                // Reset the timer
        mTimer.start();                // Make sure it is started
    }

    @Override
    public void execute() {
        // Do nothing... Maybe need to feed the motors with zeros?
    }

    @Override
    public boolean isFinished() {
        // If we are done, return true. Otherwise false.
        return (mTimer.hasPeriodPassed(mDuration));
    }

    @Override
    public void interrupted() {
        end();
    }

    @Override
    public void end() {
        mTimer.stop();                 // Stop the timer
    }

}
